// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use std::io::Cursor;

pub use image::imageops::FilterType;
pub use image::{DynamicImage, ImageFormat};

pub const DEFAULT_MAX_ALLOC: u64 = 256 * 1024 * 1024;

pub fn format_from_name(name: &str) -> Result<ImageFormat, String> {
    Ok(match name.trim().to_ascii_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpeg" | "jpg" => ImageFormat::Jpeg,
        "gif" => ImageFormat::Gif,
        "bmp" => ImageFormat::Bmp,
        "ico" => ImageFormat::Ico,
        "tiff" | "tif" => ImageFormat::Tiff,
        "pnm" | "pbm" | "pgm" | "ppm" => ImageFormat::Pnm,
        "tga" => ImageFormat::Tga,
        "qoi" => ImageFormat::Qoi,
        "farbfeld" | "ff" => ImageFormat::Farbfeld,
        "hdr" => ImageFormat::Hdr,
        "exr" | "openexr" => ImageFormat::OpenExr,
        "webp" => ImageFormat::WebP,
        "dds" => ImageFormat::Dds,
        "avif" => return Err("AVIF is not supported in this build".to_string()),
        other => return Err(format!("unknown image format: '{other}'")),
    })
}

pub fn format_name(f: ImageFormat) -> &'static str {
    match f {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpeg",
        ImageFormat::Gif => "gif",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Ico => "ico",
        ImageFormat::Tiff => "tiff",
        ImageFormat::Pnm => "pnm",
        ImageFormat::Tga => "tga",
        ImageFormat::Qoi => "qoi",
        ImageFormat::Farbfeld => "farbfeld",
        ImageFormat::Hdr => "hdr",
        ImageFormat::OpenExr => "exr",
        ImageFormat::WebP => "webp",
        ImageFormat::Dds => "dds",
        ImageFormat::Avif => "avif",
        _ => "unknown",
    }
}

pub fn format_from_path(path: &str) -> Result<ImageFormat, String> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .ok_or_else(|| format!("cannot infer format from path '{path}' (no extension; pass --format)"))?;
    format_from_name(ext)
}

pub fn filter_from_name(name: &str) -> FilterType {
    match name.trim().to_ascii_lowercase().as_str() {
        "nearest" => FilterType::Nearest,
        "triangle" => FilterType::Triangle,
        "catmullrom" | "catmull-rom" | "catmull_rom" => FilterType::CatmullRom,
        "gaussian" => FilterType::Gaussian,
        _ => FilterType::Lanczos3,
    }
}

pub fn color_type_name(img: &DynamicImage) -> &'static str {
    match img {
        DynamicImage::ImageLuma8(_) => "l8",
        DynamicImage::ImageLumaA8(_) => "la8",
        DynamicImage::ImageRgb8(_) => "rgb8",
        DynamicImage::ImageRgba8(_) => "rgba8",
        DynamicImage::ImageLuma16(_) => "l16",
        DynamicImage::ImageLumaA16(_) => "la16",
        DynamicImage::ImageRgb16(_) => "rgb16",
        DynamicImage::ImageRgba16(_) => "rgba16",
        DynamicImage::ImageRgb32F(_) => "rgb32f",
        DynamicImage::ImageRgba32F(_) => "rgba32f",
        _ => "unknown",
    }
}

fn reader_for(bytes: &[u8], hint: Option<&str>, max_alloc: u64) -> Result<image::ImageReader<Cursor<Vec<u8>>>, String> {
    let cursor = Cursor::new(bytes.to_vec());
    let mut reader = image::ImageReader::new(cursor);
    match hint {
        Some(h) => reader.set_format(format_from_name(h)?),
        None => {
            reader = reader.with_guessed_format().map_err(|e| e.to_string())?;
            if reader.format().is_none() {
                return Err("could not determine image format from content".to_string());
            }
        }
    }
    let mut limits = image::Limits::default();
    limits.max_alloc = Some(max_alloc);
    reader.limits(limits);
    Ok(reader)
}

pub fn decode(bytes: &[u8], hint: Option<&str>) -> Result<DynamicImage, String> {
    decode_with_limit(bytes, hint, DEFAULT_MAX_ALLOC)
}

pub fn decode_with_limit(bytes: &[u8], hint: Option<&str>, max_alloc: u64) -> Result<DynamicImage, String> {
    let reader = reader_for(bytes, hint, max_alloc)?;
    reader.decode().map_err(|e| e.to_string())
}

pub fn info(bytes: &[u8]) -> Result<(u32, u32, &'static str), String> {
    let reader = reader_for(bytes, None, DEFAULT_MAX_ALLOC)?;
    let fmt = reader.format().ok_or("could not determine image format")?;
    let (w, h) = reader.into_dimensions().map_err(|e| e.to_string())?;
    Ok((w, h, format_name(fmt)))
}

pub fn encode(img: &DynamicImage, format: ImageFormat, quality: Option<u8>) -> Result<Vec<u8>, String> {
    match format {
        ImageFormat::Dds => return Err("DDS encoding is not supported".to_string()),
        ImageFormat::Avif => return Err("AVIF encoding is not supported in this build".to_string()),
        _ => {}
    }
    let mut out = Cursor::new(Vec::new());
    match format {
        
        ImageFormat::Jpeg => {
            let q = quality.unwrap_or(80).clamp(1, 100);
            let rgb = img.to_rgb8();
            let mut enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, q);
            enc.encode_image(&rgb).map_err(|e| e.to_string())?;
        }

        ImageFormat::Farbfeld => {
            DynamicImage::ImageRgba16(img.to_rgba16()).write_to(&mut out, format).map_err(|e| e.to_string())?;
        }
        ImageFormat::OpenExr => {
            DynamicImage::ImageRgba32F(img.to_rgba32f()).write_to(&mut out, format).map_err(|e| e.to_string())?;
        }
        ImageFormat::Hdr => {
            DynamicImage::ImageRgb32F(img.to_rgb32f()).write_to(&mut out, format).map_err(|e| e.to_string())?;
        }
        _ => img.write_to(&mut out, format).map_err(|e| e.to_string())?,
    }
    Ok(out.into_inner())
}

pub fn resize_exact(img: &DynamicImage, w: u32, h: u32, filter: FilterType) -> DynamicImage {
    img.resize_exact(w.max(1), h.max(1), filter)
}

pub fn resize_fit(img: &DynamicImage, w: u32, h: u32, filter: FilterType) -> DynamicImage {
    img.resize(w.max(1), h.max(1), filter)
}

pub fn thumbnail(img: &DynamicImage, w: u32, h: u32) -> DynamicImage {
    img.thumbnail(w.max(1), h.max(1))
}

pub fn crop(img: &DynamicImage, x: u32, y: u32, w: u32, h: u32) -> DynamicImage {
    img.crop_imm(x, y, w.max(1), h.max(1))
}

pub fn rotate(img: &DynamicImage, degrees: u32) -> DynamicImage {
    match degrees % 360 {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => img.clone(),
    }
}

pub fn flip(img: &DynamicImage, horizontal: bool) -> DynamicImage {
    if horizontal { img.fliph() } else { img.flipv() }
}

pub fn grayscale(img: &DynamicImage) -> DynamicImage {
    img.grayscale()
}

pub fn blur(img: &DynamicImage, sigma: f32) -> DynamicImage {
    img.blur(sigma)
}

pub fn brighten(img: &DynamicImage, value: i32) -> DynamicImage {
    img.brighten(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> DynamicImage {
        DynamicImage::ImageRgba8(image::RgbaImage::from_fn(8, 6, |x, _| image::Rgba([x as u8 * 16, 0, 0, 255])))
    }

    #[test]
    fn roundtrip_lossless_formats() {

        
        for f in ["png", "bmp", "tiff", "qoi", "tga", "farbfeld", "hdr", "exr"] {
            let fmt = format_from_name(f).unwrap();
            let bytes = encode(&sample(), fmt, None).unwrap();
            let back = decode(&bytes, Some(f)).unwrap();
            assert_eq!((back.width(), back.height()), (8, 6), "format {f}");
        }
    }

    #[test]
    fn jpeg_and_webp_encode() {
        let j = encode(&sample(), ImageFormat::Jpeg, Some(85)).unwrap();
        assert_eq!(decode(&j, None).unwrap().width(), 8);
        let w = encode(&sample(), ImageFormat::WebP, None).unwrap();
        assert_eq!(decode(&w, None).unwrap().height(), 6);
    }

    #[test]
    fn dds_and_avif_encode_rejected() {
        assert!(encode(&sample(), ImageFormat::Dds, None).is_err());
        assert!(encode(&sample(), ImageFormat::Avif, None).is_err());
        assert!(format_from_name("avif").is_err());
    }

    #[test]
    fn info_is_header_only() {
        let bytes = encode(&sample(), ImageFormat::Png, None).unwrap();
        assert_eq!(info(&bytes).unwrap(), (8, 6, "png"));
    }

    #[test]
    fn transforms_dimensions() {
        let s = sample();
        assert_eq!((resize_exact(&s, 4, 4, FilterType::Triangle).width(), resize_exact(&s, 4, 4, FilterType::Triangle).height()), (4, 4));
        assert_eq!(crop(&s, 0, 0, 4, 3).width(), 4);
        assert_eq!((rotate(&s, 90).width(), rotate(&s, 90).height()), (6, 8));
        assert_eq!(flip(&s, true).width(), 8);
        assert_eq!(grayscale(&s).width(), 8);
    }

    #[test]
    fn decode_bomb_is_rejected() {
        
        let tiny = encode(&sample(), ImageFormat::Png, None).unwrap();
        
        assert!(decode_with_limit(&tiny, None, 16).is_err());
    }
}
