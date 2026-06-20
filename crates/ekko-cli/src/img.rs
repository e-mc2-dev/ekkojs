// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use crate::ImgCommands;
use anyhow::{anyhow, bail, Context, Result};
use ekko_core::image as img;
use std::io::{Read, Write};

fn read_input(path: &str) -> Result<Vec<u8>> {
    if path == "-" {
        let mut buf = Vec::new();
        std::io::stdin().read_to_end(&mut buf).context("reading stdin")?;
        Ok(buf)
    } else {
        std::fs::read(path).with_context(|| format!("reading '{path}'"))
    }
}

fn write_output(path: &str, bytes: &[u8], force: bool) -> Result<()> {
    if path == "-" {
        let mut out = std::io::stdout();
        out.write_all(bytes).context("writing stdout")?;
        out.flush().ok();
        return Ok(());
    }
    if !force && std::path::Path::new(path).exists() {
        bail!("'{path}' already exists (use -f/--force to overwrite)");
    }
    std::fs::write(path, bytes).with_context(|| format!("writing '{path}'"))
}

fn out_format(output: &str, format: &Option<String>) -> Result<img::ImageFormat> {
    match format {
        Some(f) => img::format_from_name(f).map_err(|e| anyhow!(e)),
        None if output == "-" => bail!("writing to stdout requires --format"),
        None => img::format_from_path(output).map_err(|e| anyhow!(e)),
    }
}

fn decode(input: &str) -> Result<img::DynamicImage> {
    let bytes = read_input(input)?;
    img::decode(&bytes, None).map_err(|e| anyhow!(e))
}

fn emit(im: &img::DynamicImage, output: &str, format: img::ImageFormat, quality: Option<u8>, force: bool) -> Result<usize> {
    let bytes = img::encode(im, format, quality).map_err(|e| anyhow!(e))?;
    let n = bytes.len();
    write_output(output, &bytes, force)?;
    Ok(n)
}

fn done(output: &str, n: usize) {
    if output != "-" {
        eprintln!("wrote {output} ({})", human(n as u64));
    }
}

fn human(n: u64) -> String {
    const U: [&str; 4] = ["B", "KB", "MB", "GB"];
    let mut v = n as f64;
    let mut i = 0;
    while v >= 1024.0 && i < U.len() - 1 {
        v /= 1024.0;
        i += 1;
    }
    if i == 0 { format!("{n} B") } else { format!("{v:.1} {}", U[i]) }
}

fn cover(im: &img::DynamicImage, tw: u32, th: u32, filter: img::FilterType) -> img::DynamicImage {
    let (w, h) = (im.width().max(1), im.height().max(1));
    let scale = (tw as f32 / w as f32).max(th as f32 / h as f32);
    let nw = ((w as f32 * scale).ceil() as u32).max(tw);
    let nh = ((h as f32 * scale).ceil() as u32).max(th);
    let resized = img::resize_exact(im, nw, nh, filter);
    img::crop(&resized, (nw - tw) / 2, (nh - th) / 2, tw, th)
}

fn parse_crop(s: &str) -> Result<(u32, u32, u32, u32)> {
    let p: Vec<&str> = s.split(',').collect();
    if p.len() != 4 {
        bail!("--crop expects X,Y,W,H");
    }
    let n = |x: &str| x.trim().parse::<u32>().map_err(|_| anyhow!("--crop: '{x}' is not a number"));
    Ok((n(p[0])?, n(p[1])?, n(p[2])?, n(p[3])?))
}

fn parse_resize(s: &str) -> Result<(Option<u32>, Option<u32>)> {
    let (a, b) = s.split_once('x').ok_or_else(|| anyhow!("--resize expects WxH (or Wx / xH)"))?;
    let parse = |x: &str| -> Result<Option<u32>> {
        if x.trim().is_empty() { Ok(None) } else { Ok(Some(x.trim().parse::<u32>().map_err(|_| anyhow!("--resize: '{x}' is not a number"))?)) }
    };
    let (w, h) = (parse(a)?, parse(b)?);
    if w.is_none() && h.is_none() {
        bail!("--resize needs at least one dimension");
    }
    Ok((w, h))
}

fn resize_apply(im: &img::DynamicImage, w: Option<u32>, h: Option<u32>, fit: &str, filter: img::FilterType) -> Result<img::DynamicImage> {
    Ok(match (w, h) {
        (Some(w), Some(h)) => match fit {
            "exact" => img::resize_exact(im, w, h, filter),
            "contain" => img::resize_fit(im, w, h, filter),
            "cover" => cover(im, w, h, filter),
            other => bail!("--fit must be exact|contain|cover (got '{other}')"),
        },
        (Some(w), None) => img::resize_fit(im, w, u32::MAX, filter),
        (None, Some(h)) => img::resize_fit(im, u32::MAX, h, filter),
        (None, None) => bail!("resize needs --width and/or --height"),
    })
}

pub fn handle_img_command(command: ImgCommands) -> Result<()> {
    match command {
        ImgCommands::Info { input, json } => {
            let bytes = read_input(&input)?;
            let (w, h, fmt) = img::info(&bytes).map_err(|e| anyhow!(e))?;
            if json {
                println!("{{\"width\":{w},\"height\":{h},\"format\":\"{fmt}\",\"bytes\":{}}}", bytes.len());
            } else {
                println!("{w}x{h}  {fmt}  {}", human(bytes.len() as u64));
            }
            Ok(())
        }
        ImgCommands::Convert { input, output, format, quality, force } => {
            let im = decode(&input)?;
            let n = emit(&im, &output, out_format(&output, &format)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Compress { input, output, format, quality, force } => {
            let orig = read_input(&input)?;
            let im = img::decode(&orig, None).map_err(|e| anyhow!(e))?;
            let out = output.unwrap_or_else(|| default_min_path(&input));
            let fmt = out_format(&out, &format)?;
            let bytes = img::encode(&im, fmt, Some(quality.unwrap_or(75))).map_err(|e| anyhow!(e))?;
            let n = bytes.len();
            write_output(&out, &bytes, force)?;
            if out != "-" {
                let before = orig.len() as i64;
                let pct = if before > 0 { (n as i64 - before) * 100 / before } else { 0 };
                eprintln!("{} → {} ({}{}%)  {out}", human(orig.len() as u64), human(n as u64), if pct <= 0 { "" } else { "+" }, pct);
            }
            Ok(())
        }
        ImgCommands::Resize { input, output, width, height, fit, filter, format, quality, force } => {
            let im = decode(&input)?;
            let out_im = resize_apply(&im, width, height, &fit, img::filter_from_name(&filter))?;
            let n = emit(&out_im, &output, out_format(&output, &format)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Thumbnail { input, output, width, height, quality, force } => {
            let im = img::thumbnail(&decode(&input)?, width, height);
            let n = emit(&im, &output, out_format(&output, &None)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Crop { input, output, x, y, width, height, force } => {
            let im = img::crop(&decode(&input)?, x, y, width, height);
            let n = emit(&im, &output, out_format(&output, &None)?, None, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Rotate { input, output, degrees, force } => {
            if !matches!(degrees, 90 | 180 | 270) {
                bail!("--degrees must be 90, 180 or 270");
            }
            let im = img::rotate(&decode(&input)?, degrees);
            let n = emit(&im, &output, out_format(&output, &None)?, None, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Flip { input, output, horizontal, vertical, force } => {
            if horizontal == vertical {
                bail!("pass exactly one of --horizontal or --vertical");
            }
            let im = img::flip(&decode(&input)?, horizontal);
            let n = emit(&im, &output, out_format(&output, &None)?, None, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Grayscale { input, output, quality, force } => {
            let im = img::grayscale(&decode(&input)?);
            let n = emit(&im, &output, out_format(&output, &None)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Blur { input, output, sigma, quality, force } => {
            let im = img::blur(&decode(&input)?, sigma);
            let n = emit(&im, &output, out_format(&output, &None)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Brighten { input, output, value, quality, force } => {
            let im = img::brighten(&decode(&input)?, value);
            let n = emit(&im, &output, out_format(&output, &None)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
        ImgCommands::Edit { input, output, resize, crop, rotate, flip, grayscale, blur, brighten, format, quality, force } => {
            let mut im = decode(&input)?;
            if let Some(c) = crop {
                let (x, y, w, h) = parse_crop(&c)?;
                im = img::crop(&im, x, y, w, h);
            }
            if let Some(r) = resize {
                let (w, h) = parse_resize(&r)?;
                im = resize_apply(&im, w, h, "exact", img::filter_from_name("lanczos3"))?;
            }
            if let Some(d) = rotate {
                if !matches!(d, 90 | 180 | 270) {
                    bail!("--rotate must be 90, 180 or 270");
                }
                im = img::rotate(&im, d);
            }
            if let Some(f) = flip {
                match f.as_str() {
                    "h" | "horizontal" => im = img::flip(&im, true),
                    "v" | "vertical" => im = img::flip(&im, false),
                    other => bail!("--flip must be h or v (got '{other}')"),
                }
            }
            if grayscale {
                im = img::grayscale(&im);
            }
            if let Some(s) = blur {
                im = img::blur(&im, s);
            }
            if let Some(v) = brighten {
                im = img::brighten(&im, v);
            }
            let n = emit(&im, &output, out_format(&output, &format)?, quality, force)?;
            done(&output, n);
            Ok(())
        }
    }
}

fn default_min_path(input: &str) -> String {
    let p = std::path::Path::new(input);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("out");
    let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("png");
    let min = format!("{stem}.min.{ext}");
    match p.parent() {
        Some(d) if !d.as_os_str().is_empty() => d.join(min).to_string_lossy().into_owned(),
        _ => min,
    }
}
