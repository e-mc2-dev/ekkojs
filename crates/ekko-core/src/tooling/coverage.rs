// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct ScriptCoverage {
    pub url: String,
    pub functions: Vec<FunctionCoverage>,
}

#[derive(Debug, Clone)]
pub struct FunctionCoverage {
    pub function_name: String,
    pub ranges: Vec<CoverageRange>,
}

#[derive(Debug, Clone)]
pub struct CoverageRange {
    pub start_offset: usize,
    pub end_offset: usize,
    pub count: u32,
}

pub fn line_offsets(source: &str) -> Vec<usize> {
    let mut offsets = vec![0usize];
    for (i, ch) in source.bytes().enumerate() {
        if ch == b'\n' {
            offsets.push(i + 1);
        }
    }
    offsets
}

pub fn offset_to_line(offsets: &[usize], byte_offset: usize) -> usize {
    match offsets.binary_search(&byte_offset) {
        Ok(i) => i + 1,
        Err(i) => i,
    }
}

pub fn to_lcov(scripts: &[ScriptCoverage], sources: &HashMap<String, String>) -> String {
    let mut lcov = String::new();

    for script in scripts {
        if script.url.starts_with("ekko:") || script.url.is_empty() || script.url == "[eval]" {
            continue;
        }

        let source = match sources.get(&script.url) {
            Some(s) => s,
            None => continue,
        };

        let offsets = line_offsets(source);
        let total_lines = offsets.len();

        lcov.push_str(&format!("SF:{}\n", script.url));

        let mut line_counts: HashMap<usize, u32> = HashMap::new();
        let mut fn_names: Vec<(usize, String, u32)> = Vec::new();

        for func in &script.functions {
            for range in &func.ranges {
                let start_line = offset_to_line(&offsets, range.start_offset);
                let end_line = offset_to_line(&offsets, range.end_offset).min(total_lines);
                for line in start_line..=end_line {
                    let entry = line_counts.entry(line).or_insert(range.count);
                    if range.count < *entry {
                        *entry = range.count;
                    }
                }
            }

            if !func.function_name.is_empty() && !func.ranges.is_empty() {
                let first = &func.ranges[0];
                let fn_line = offset_to_line(&offsets, first.start_offset);
                fn_names.push((fn_line, func.function_name.clone(), first.count));
            }
        }

        let mut fn_found = 0u32;
        let mut fn_hit = 0u32;
        for (line, name, count) in &fn_names {
            lcov.push_str(&format!("FN:{},{}\n", line, name));
            lcov.push_str(&format!("FNDA:{},{}\n", count, name));
            fn_found += 1;
            if *count > 0 { fn_hit += 1; }
        }
        lcov.push_str(&format!("FNF:{}\n", fn_found));
        lcov.push_str(&format!("FNH:{}\n", fn_hit));

        let mut br_found = 0u32;
        let mut br_hit = 0u32;
        for func in &script.functions {
            if func.ranges.len() > 1 {
                for (i, range) in func.ranges[1..].iter().enumerate() {
                    let line = offset_to_line(&offsets, range.start_offset);
                    lcov.push_str(&format!("BRDA:{},0,{},{}\n", line, i, range.count));
                    br_found += 1;
                    if range.count > 0 { br_hit += 1; }
                }
            }
        }
        lcov.push_str(&format!("BRF:{}\n", br_found));
        lcov.push_str(&format!("BRH:{}\n", br_hit));

        let mut lines_found = 0u32;
        let mut lines_hit = 0u32;
        let mut sorted: Vec<_> = line_counts.iter().collect();
        sorted.sort_by_key(|(ln, _)| **ln);
        for (ln, ct) in &sorted {
            lcov.push_str(&format!("DA:{},{}\n", ln, ct));
            lines_found += 1;
            if **ct > 0 { lines_hit += 1; }
        }
        lcov.push_str(&format!("LF:{}\n", lines_found));
        lcov.push_str(&format!("LH:{}\n", lines_hit));
        lcov.push_str("end_of_record\n");
    }

    lcov
}

pub fn parse_lcov(lcov: &str) -> Vec<(String, HashMap<usize, u32>)> {
    let mut files = Vec::new();
    let mut current_file = String::new();
    let mut current_lines: HashMap<usize, u32> = HashMap::new();

    for line in lcov.lines() {
        if let Some(path) = line.strip_prefix("SF:") {
            current_file = path.to_string();
            current_lines = HashMap::new();
        } else if let Some(rest) = line.strip_prefix("DA:") {
            let parts: Vec<&str> = rest.splitn(2, ',').collect();
            if parts.len() == 2 {
                if let (Ok(ln), Ok(ct)) = (parts[0].parse::<usize>(), parts[1].parse::<u32>()) {
                    current_lines.insert(ln, ct);
                }
            }
        } else if line == "end_of_record" && !current_file.is_empty() {
            files.push((current_file.clone(), current_lines.clone()));
        }
    }
    files
}

pub fn generate_html_report(lcov_path: &Path, output_dir: &Path) -> Result<(), String> {
    let lcov = std::fs::read_to_string(lcov_path).map_err(|e| e.to_string())?;
    let files = parse_lcov(&lcov);
    std::fs::create_dir_all(output_dir).map_err(|e| e.to_string())?;

    let mut index = String::new();
    index.push_str(&html_header("EkkoJS Coverage Report", None));
    index.push_str("<div class=\"container\"><h1>EkkoJS Coverage Report</h1>\n");
    index.push_str("<table><thead><tr><th>File</th><th>Lines</th><th>Coverage</th><th></th></tr></thead><tbody>\n");

    let mut total_found = 0u32;
    let mut total_hit = 0u32;

    for (filepath, lines) in &files {
        let found = lines.len() as u32;
        let hit = lines.values().filter(|&&c| c > 0).count() as u32;
        total_found += found;
        total_hit += hit;
        let pct = if found > 0 { (hit as f64 / found as f64) * 100.0 } else { 0.0 };
        let short = filepath.rsplit('/').next().unwrap_or(filepath);
        let safe = filepath.replace('/', "_").replace('\\', "_").replace(':', "_");
        let bar_class = if pct >= 80.0 { "high" } else if pct >= 50.0 { "medium" } else { "low" };

        index.push_str(&format!(
            "<tr><td><a href=\"{safe}.html\">{short}</a></td><td>{hit}/{found}</td><td><div class=\"bar\"><div class=\"fill {bar_class}\" style=\"width:{pct:.0}%\"></div></div></td><td class=\"pct {bar_class}\">{pct:.1}%</td></tr>\n"
        ));

        let source = std::fs::read_to_string(filepath).unwrap_or_else(|_| "(source not available)".to_string());
        let file_html = generate_file_html(short, filepath, &source, lines);
        std::fs::write(output_dir.join(format!("{safe}.html")), file_html).map_err(|e| e.to_string())?;
    }

    let total_pct = if total_found > 0 { (total_hit as f64 / total_found as f64) * 100.0 } else { 0.0 };
    index.push_str("</tbody></table>\n");
    index.push_str(&format!("<div class=\"summary\">Total: {total_hit}/{total_found} lines ({total_pct:.1}%)</div>\n"));
    index.push_str("</div></body></html>");

    std::fs::write(output_dir.join("index.html"), index).map_err(|e| e.to_string())?;
    Ok(())
}

fn html_header(title: &str, metrics: Option<&CoverageMetrics>) -> String {
    let header_bar = if let Some(m) = metrics {
        format!(r#"<div class="header-bar">
<span class="logo">EkkoJS Coverage</span>
<div class="metrics-bar">
<div class="metric {}">Stmts <strong>{:.1}%</strong> <small>{}/{}</small></div>
<div class="metric {}">Branch <strong>{:.1}%</strong> <small>{}/{}</small></div>
<div class="metric {}">Funcs <strong>{:.1}%</strong> <small>{}/{}</small></div>
<div class="metric {}">Lines <strong>{:.1}%</strong> <small>{}/{}</small></div>
</div></div>"#,
            pct_class(m.stmts_pct()), m.stmts_pct(), m.stmts_hit, m.stmts_total,
            pct_class(m.branches_pct()), m.branches_pct(), m.branches_hit, m.branches_total,
            pct_class(m.funcs_pct()), m.funcs_pct(), m.funcs_hit, m.funcs_total,
            pct_class(m.lines_pct()), m.lines_pct(), m.lines_hit, m.lines_total,
        )
    } else { String::new() };

    format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{css}</style>
</head>
<body>
{header_bar}
<script>{js}</script>
"#,
        css = include_str!("../modules/coverage.css"),
        js = include_str!("../modules/coverage.js"),
    )
}

fn generate_file_html(short_name: &str, full_path: &str, source: &str, lines: &HashMap<usize, u32>) -> String {
    let mut html = html_header(&format!("{} - Coverage", short_name), None);
    html.push_str("<div class=\"container\">\n");
    html.push_str("<a class=\"back\" href=\"index.html\">Back to index</a>\n");

    let found = lines.len();
    let hit = lines.values().filter(|&&c| c > 0).count();
    let pct = if found > 0 { (hit as f64 / found as f64) * 100.0 } else { 0.0 };
    html.push_str(&format!("<h1>{short_name} <span class=\"pct {}\">{pct:.1}%</span></h1>\n",
        if pct >= 80.0 { "high" } else if pct >= 50.0 { "medium" } else { "low" }));
    html.push_str(&format!("<p style=\"color:#888;margin-bottom:12px\">{full_path}</p>\n"));
    html.push_str("<div class=\"source\"><table>\n");

    for (i, line_text) in source.lines().enumerate() {
        let line_num = i + 1;
        let (class, count_str) = match lines.get(&line_num) {
            Some(&c) if c > 0 => ("hit", format!("{}x", c)),
            Some(_) => ("miss", "0x".to_string()),
            None => ("", "".to_string()),
        };
        let highlighted = syntax_highlight(line_text);
        html.push_str(&format!(
            "<tr class=\"{class}\"><td class=\"ln\">{line_num}</td><td class=\"ct\">{count_str}</td><td class=\"code\">{highlighted}</td></tr>\n"
        ));
    }

    html.push_str("</table></div></div></body></html>");
    html
}

fn syntax_highlight(line: &str) -> String {
    let escaped = line.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    let keywords = ["import", "from", "export", "const", "let", "var", "function", "return",
        "if", "else", "for", "while", "async", "await", "new", "class", "extends",
        "try", "catch", "throw", "typeof", "instanceof", "true", "false", "null", "undefined",
        "describe", "test", "expect", "interface", "type"];

    let mut result = String::with_capacity(escaped.len() * 2);
    let chars: Vec<char> = escaped.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        if i + 1 < len && chars[i] == '/' && chars[i + 1] == '/' {
            result.push_str("<span class=\"cm\">");
            while i < len { result.push(chars[i]); i += 1; }
            result.push_str("</span>");
            continue;
        }
        if chars[i] == '\'' || chars[i] == '"' || chars[i] == '`' {
            let quote = chars[i];
            result.push_str("<span class=\"str\">");
            result.push(chars[i]); i += 1;
            while i < len && chars[i] != quote {
                if chars[i] == '\\' && i + 1 < len { result.push(chars[i]); i += 1; }
                result.push(chars[i]); i += 1;
            }
            if i < len { result.push(chars[i]); i += 1; }
            result.push_str("</span>");
            continue;
        }
        if chars[i].is_ascii_digit() && (i == 0 || !chars[i - 1].is_ascii_alphanumeric()) {
            result.push_str("<span class=\"num\">");
            while i < len && (chars[i].is_ascii_digit() || chars[i] == '.') { result.push(chars[i]); i += 1; }
            result.push_str("</span>");
            continue;
        }
        if chars[i].is_ascii_alphabetic() || chars[i] == '_' || chars[i] == '$' {
            let start = i;
            while i < len && (chars[i].is_ascii_alphanumeric() || chars[i] == '_' || chars[i] == '$') { i += 1; }
            let word: String = chars[start..i].iter().collect();
            if keywords.contains(&word.as_str()) {
                result.push_str(&format!("<span class=\"kw\">{word}</span>"));
            } else if i < len && chars[i] == '(' {
                result.push_str(&format!("<span class=\"fn\">{word}</span>"));
            } else {
                result.push_str(&word);
            }
            continue;
        }
        if "=+-*/<>!&|?:;,.(){}[]".contains(chars[i]) {
            result.push_str("<span class=\"op\">");
            result.push(chars[i]);
            result.push_str("</span>");
            i += 1;
            continue;
        }
        result.push(chars[i]);
        i += 1;
    }
    result
}

#[derive(Debug, Clone, Default)]
pub struct CoverageMetrics {
    pub stmts_total: u32,
    pub stmts_hit: u32,
    pub branches_total: u32,
    pub branches_hit: u32,
    pub funcs_total: u32,
    pub funcs_hit: u32,
    pub lines_total: u32,
    pub lines_hit: u32,
}

impl CoverageMetrics {
    
    pub fn stmts_pct(&self) -> f64 { if self.stmts_total == 0 { 0.0 } else { self.stmts_hit as f64 / self.stmts_total as f64 * 100.0 } }
    
    pub fn branches_pct(&self) -> f64 { if self.branches_total == 0 { 0.0 } else { self.branches_hit as f64 / self.branches_total as f64 * 100.0 } }
    
    pub fn funcs_pct(&self) -> f64 { if self.funcs_total == 0 { 0.0 } else { self.funcs_hit as f64 / self.funcs_total as f64 * 100.0 } }
    
    pub fn lines_pct(&self) -> f64 { if self.lines_total == 0 { 0.0 } else { self.lines_hit as f64 / self.lines_total as f64 * 100.0 } }
    
    pub fn add(&mut self, other: &CoverageMetrics) {
        self.stmts_total += other.stmts_total; self.stmts_hit += other.stmts_hit;
        self.branches_total += other.branches_total; self.branches_hit += other.branches_hit;
        self.funcs_total += other.funcs_total; self.funcs_hit += other.funcs_hit;
        self.lines_total += other.lines_total; self.lines_hit += other.lines_hit;
    }
}

#[derive(Debug, Clone)]
pub struct FuncInfo {
    pub name: String,
    pub line: usize,
    pub count: u32,
}

#[derive(Debug, Clone)]
pub struct CoverageFileEntry {
    pub name: String,
    pub rel_path: String,
    pub total_lines: u32,
    pub hit_lines: u32,
    pub line_data: HashMap<usize, u32>,
    pub source: String,
    pub metrics: CoverageMetrics,
    pub functions: Vec<FuncInfo>,
    pub partial_lines: std::collections::HashSet<usize>,
}

#[derive(Debug, Clone)]
pub struct CoverageNode {
    pub name: String,
    pub rel_path: String,
    pub children: Vec<CoverageNode>,
    pub files: Vec<CoverageFileEntry>,
}

impl CoverageNode {
    
    pub fn metrics(&self) -> CoverageMetrics {
        let mut m = CoverageMetrics::default();
        for f in &self.files { m.add(&f.metrics); }
        for c in &self.children { m.add(&c.metrics()); }
        m
    }
    
    pub fn total_lines(&self) -> u32 { self.metrics().lines_total }
    
    pub fn hit_lines(&self) -> u32 { self.metrics().lines_hit }
    
    pub fn pct(&self) -> f64 { self.metrics().lines_pct() }
}

pub fn build_tree(files: &[CoverageFileEntry], root_name: &str) -> CoverageNode {
    let mut root = CoverageNode { name: root_name.to_string(), rel_path: String::new(), children: vec![], files: vec![] };

    for file in files {
        let parts: Vec<&str> = file.rel_path.split('/').collect();
        let mut node = &mut root;

        for i in 0..parts.len() - 1 {
            let dir_name = parts[i];
            let dir_path = parts[..=i].join("/");
            let idx = node.children.iter().position(|c| c.name == dir_name);
            if idx.is_none() {
                node.children.push(CoverageNode { name: dir_name.to_string(), rel_path: dir_path, children: vec![], files: vec![] });
            }
            let idx = node.children.iter().position(|c| c.name == dir_name).unwrap();
            node = &mut node.children[idx];
        }
        node.files.push(file.clone());
    }

    sort_tree(&mut root);
    root
}

fn sort_tree(node: &mut CoverageNode) {
    node.children.sort_by(|a, b| a.pct().partial_cmp(&b.pct()).unwrap_or(std::cmp::Ordering::Equal));
    node.files.sort_by(|a, b| {
        let pa = if a.total_lines == 0 { 0.0 } else { a.hit_lines as f64 / a.total_lines as f64 };
        let pb = if b.total_lines == 0 { 0.0 } else { b.hit_lines as f64 / b.total_lines as f64 };
        pa.partial_cmp(&pb).unwrap_or(std::cmp::Ordering::Equal)
    });
    for child in &mut node.children {
        sort_tree(child);
    }
}

pub fn generate_tree_report(tree: &CoverageNode, output_dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(output_dir).map_err(|e| e.to_string())?;
    generate_folder_page(tree, output_dir, &Vec::new())?;
    Ok(())
}

fn breadcrumb_html(trail: &[(&str, &str)]) -> String {
    let mut html = String::from("<nav class=\"breadcrumb\">");
    for (i, (name, href)) in trail.iter().enumerate() {
        if i > 0 { html.push_str(" &gt; "); }
        html.push_str(&format!("<a href=\"{}\">{}</a>", href, name));
    }
    html.push_str("</nav>\n");
    html
}

fn pct_class(pct: f64) -> &'static str {
    if pct >= 80.0 { "high" } else if pct >= 50.0 { "medium" } else { "low" }
}

fn metric_cell(hit: u32, total: u32) -> String {
    let pct = if total == 0 { 0.0 } else { hit as f64 / total as f64 * 100.0 };
    let cls = pct_class(pct);
    format!("<td><div class=\"bar\"><div class=\"fill {}\" style=\"width:{:.0}%\"></div></div><span class=\"pct {}\">{:.1}%</span> <span class=\"cnt\">{}/{}</span></td>", cls, pct, cls, pct, hit, total)
}

fn generate_folder_page(node: &CoverageNode, output_dir: &Path, path_parts: &[String]) -> Result<(), String> {
    let folder_dir = if node.rel_path.is_empty() { output_dir.to_path_buf() } else { output_dir.join(&node.rel_path) };
    std::fs::create_dir_all(&folder_dir).map_err(|e| e.to_string())?;

    let depth = path_parts.len();
    let title = if depth == 0 { "Coverage Report".to_string() } else { format!("{} — Coverage", node.rel_path) };
    let nm = node.metrics();
    let mut html = html_header(&title, Some(&nm));
    html.push_str("<div class=\"container\">\n");

    if depth > 0 {
        html.push_str("<nav class=\"breadcrumb\">");
        let to_root = "../".repeat(depth);
        html.push_str(&format!("<a href=\"{}index.html\">root</a>", to_root));
        for (i, part) in path_parts.iter().enumerate() {
            let levels_up = depth - i - 1;
            let href = if levels_up == 0 { "index.html".to_string() } else { format!("{}index.html", "../".repeat(levels_up)) };
            html.push_str(&format!(" / <a href=\"{}\">{}</a>", href, part));
        }
        html.push_str("</nav>\n");
    }

    let display_name = if depth == 0 { "All files" } else { &node.name };
    html.push_str(&format!("<h1>{}</h1>\n", display_name));
    html.push_str(&format!("<p class=\"summary\">{} / {} lines covered across {} files</p>\n",
        nm.lines_hit, nm.lines_total,
        node.files.len() + node.children.iter().map(|c| c.files.len()).sum::<usize>()));

    html.push_str("<table class=\"cov\"><thead><tr><th>File</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Lines</th></tr></thead><tbody>\n");

    for child in &node.children {
        let cm = child.metrics();
        let href = format!("{}/index.html", child.name);
        html.push_str(&format!("<tr><td><a href=\"{}\">📁 {}/</a></td>{}{}{}{}  </tr>\n",
            href, child.name,
            metric_cell(cm.stmts_hit, cm.stmts_total),
            metric_cell(cm.branches_hit, cm.branches_total),
            metric_cell(cm.funcs_hit, cm.funcs_total),
            metric_cell(cm.lines_hit, cm.lines_total),
        ));
    }

    for file in &node.files {
        let href = format!("{}.html", file.name);
        let fm = &file.metrics;
        html.push_str(&format!("<tr><td><a href=\"{}\">{}</a></td>{}{}{}{}</tr>\n",
            href, file.name,
            metric_cell(fm.stmts_hit, fm.stmts_total),
            metric_cell(fm.branches_hit, fm.branches_total),
            metric_cell(fm.funcs_hit, fm.funcs_total),
            metric_cell(fm.lines_hit, fm.lines_total),
        ));

        let fm = &file.metrics;
        let mut file_html = html_header(&format!("{} — Coverage", file.name), Some(fm));
        file_html.push_str("<div class=\"container\">\n");
        
        file_html.push_str("<nav class=\"breadcrumb\">");
        let to_root = "../".repeat(depth + 1);
        file_html.push_str(&format!("<a href=\"{}index.html\">root</a>", to_root));
        for (i, part) in path_parts.iter().enumerate() {
            let levels_up = depth - i;
            file_html.push_str(&format!(" / <a href=\"{}index.html\">{}</a>", "../".repeat(levels_up), part));
        }
        file_html.push_str(&format!(" / {}", file.name));
        file_html.push_str("</nav>\n");

        file_html.push_str(&format!("<h1>{}</h1>\n", file.name));
        file_html.push_str(&format!("<p class=\"summary\">{}</p>\n", file.rel_path));

        if !file.functions.is_empty() {
            file_html.push_str("<details open style=\"margin-bottom:16px\"><summary style=\"cursor:pointer;color:#89b4fa;font-weight:600\">Functions</summary>\n");
            file_html.push_str("<table class=\"cov\"><thead><tr><th>Function</th><th>Line</th><th>Calls</th></tr></thead><tbody>\n");
            for fi in &file.functions {
                let cls = if fi.count > 0 { "high" } else { "low" };
                file_html.push_str(&format!("<tr><td>{}</td><td>{}</td><td class=\"pct {}\">{}</td></tr>\n",
                    fi.name, fi.line, cls, fi.count));
            }
            file_html.push_str("</tbody></table></details>\n");
        }

        file_html.push_str("<div class=\"source\"><table>\n");
        for (i, line_text) in file.source.lines().enumerate() {
            let line_num = i + 1;
            let is_partial = file.partial_lines.contains(&line_num);
            let (class, ct_class, count_str) = match file.line_data.get(&line_num) {
                Some(&c) if c > 0 && is_partial => ("partial", "ct hit", format!("{}x", c)),
                Some(&c) if c > 0 => ("hit", "ct hit", format!("{}x", c)),
                Some(_) => ("miss", "ct miss", "0x".to_string()),
                None => ("", "ct", String::new()),
            };
            let highlighted = syntax_highlight(line_text);
            file_html.push_str(&format!(
                "<tr class=\"{class}\"><td class=\"ln\">{line_num}</td><td class=\"{ct_class}\">{count_str}</td><td class=\"code\">{highlighted}</td></tr>\n"
            ));
        }
        file_html.push_str("</table></div></div></body></html>");
        std::fs::write(folder_dir.join(format!("{}.html", file.name)), file_html).map_err(|e| e.to_string())?;
    }

    html.push_str("</tbody></table>\n</div></body></html>");
    std::fs::write(folder_dir.join("index.html"), html).map_err(|e| e.to_string())?;

    for child in &node.children {
        let mut child_parts = path_parts.to_vec();
        child_parts.push(child.name.clone());
        generate_folder_page(child, output_dir, &child_parts)?;
    }

    Ok(())
}

pub fn read_config(dir: &Path) -> (Vec<String>, Vec<String>) {
    let config_path = dir.join("ekko.json");
    if !config_path.exists() {
        return (vec!["src/**/*.ts".to_string(), "src/**/*.js".to_string()],
                vec!["tests/**".to_string(), "*.test.ts".to_string(), "*.test.js".to_string()]);
    }
    let content = match std::fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return (vec!["src/**/*.ts".to_string()], vec!["tests/**".to_string()]),
    };

    let mut includes = Vec::new();
    let mut excludes = Vec::new();

    if let Some(cov_start) = content.find("\"coverage\"") {
        let rest = &content[cov_start..];
        
        if let Some(inc_start) = rest.find("\"include\"") {
            if let Some(arr_start) = rest[inc_start..].find('[') {
                let s = inc_start + arr_start + 1;
                if let Some(arr_end) = rest[s..].find(']') {
                    let arr = &rest[s..s + arr_end];
                    for part in arr.split(',') {
                        let trimmed = part.trim().trim_matches('"').trim();
                        if !trimmed.is_empty() { includes.push(trimmed.to_string()); }
                    }
                }
            }
        }
        
        if let Some(exc_start) = rest.find("\"exclude\"") {
            if let Some(arr_start) = rest[exc_start..].find('[') {
                let s = exc_start + arr_start + 1;
                if let Some(arr_end) = rest[s..].find(']') {
                    let arr = &rest[s..s + arr_end];
                    for part in arr.split(',') {
                        let trimmed = part.trim().trim_matches('"').trim();
                        if !trimmed.is_empty() { excludes.push(trimmed.to_string()); }
                    }
                }
            }
        }
    }

    if includes.is_empty() { includes.push("src/**/*.ts".to_string()); }
    if excludes.is_empty() { excludes.push("tests/**".to_string()); }
    (includes, excludes)
}

pub fn matches_glob(path: &str, pattern: &str) -> bool {
    if pattern == "**" { return true; }
    if pattern.contains("**") {
        let parts: Vec<&str> = pattern.split("**").collect();
        if parts.len() == 2 {
            let prefix = parts[0].trim_end_matches('/');
            let suffix = parts[1].trim_start_matches('/');
            if !prefix.is_empty() && !path.starts_with(prefix) { return false; }
            if !suffix.is_empty() {
                if suffix.starts_with("*.") {
                    let ext = &suffix[1..];
                    return path.ends_with(ext);
                }
                return path.ends_with(suffix);
            }
            return true;
        }
    }
    if pattern.starts_with("*.") {
        return path.ends_with(&pattern[1..]);
    }
    path == pattern
}

pub fn discover_source_files(root: &Path, includes: &[String], excludes: &[String]) -> Vec<String> {
    let mut result = Vec::new();
    walk_dir(root, root, includes, excludes, &mut result);
    result.sort();
    result
}

fn walk_dir(dir: &Path, root: &Path, includes: &[String], excludes: &[String], result: &mut Vec<String>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if name.starts_with('.') || name == "node_modules" || name == "coverage" { continue; }
            walk_dir(&path, root, includes, excludes, result);
        } else {
            let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            let included = includes.iter().any(|p| matches_glob(&rel, p));
            let excluded = excludes.iter().any(|p| matches_glob(&rel, p));
            if included && !excluded {
                result.push(rel);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_line_offsets() {
        let source = "line1\nline2\nline3\n";
        let offsets = line_offsets(source);
        assert_eq!(offsets, vec![0, 6, 12, 18]);
    }

    #[test]
    fn test_offset_to_line() {
        let offsets = vec![0, 6, 12, 18];
        assert_eq!(offset_to_line(&offsets, 0), 1);
        assert_eq!(offset_to_line(&offsets, 3), 1);
        assert_eq!(offset_to_line(&offsets, 6), 2);
        assert_eq!(offset_to_line(&offsets, 15), 3);
    }

    #[test]
    fn test_lcov_generation() {
        let scripts = vec![ScriptCoverage {
            url: "test.ts".to_string(),
            functions: vec![FunctionCoverage {
                function_name: "add".to_string(),
                ranges: vec![CoverageRange { start_offset: 0, end_offset: 30, count: 5 }],
            }],
        }];
        let mut sources = HashMap::new();
        sources.insert("test.ts".to_string(), "function add(a, b) {\n  return a + b;\n}\n".to_string());
        let lcov = to_lcov(&scripts, &sources);
        assert!(lcov.contains("SF:test.ts"));
        assert!(lcov.contains("FN:1,add"));
        assert!(lcov.contains("FNDA:5,add"));
        assert!(lcov.contains("end_of_record"));
    }

    #[test]
    fn test_skips_internal_modules() {
        let scripts = vec![ScriptCoverage { url: "ekko:test".to_string(), functions: vec![] }];
        let sources = HashMap::new();
        let lcov = to_lcov(&scripts, &sources);
        assert!(lcov.is_empty());
    }
}
