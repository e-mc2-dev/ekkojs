// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



mod md_ansi;

use std::collections::HashMap;

use anyhow::{anyhow, bail, Result};
use ekko_vfs::EklPackage;
use serde::Deserialize;

static DOC_EKL: &[u8] = include_bytes!("../../assets/docs.ekl");

#[derive(Deserialize)]
struct Bundle {
    topics: Vec<Topic>,
    trees: HashMap<String, Vec<TreeNode>>,
    docs: HashMap<String, Doc>,
    by_path: HashMap<String, String>,
    intro: String,
}

#[derive(Deserialize)]
struct Topic {
    key: String,
    aliases: Vec<String>,
    title: String,
}

#[derive(Deserialize)]
struct TreeNode {
    label: String,
    #[serde(default)]
    number: Option<String>,
    #[serde(default)]
    children: Vec<TreeNode>,
}

#[derive(Deserialize)]
struct Doc {
    #[allow(dead_code)]
    topic: String,
    #[serde(default)]
    #[allow(dead_code)]
    number: String,
    title: String,
    #[serde(default)]
    crumbs: Vec<String>,
    url: String,
    clean: String,
    raw: String,
}

#[derive(Debug)]
enum Request {
    Intro,
    Tree(String),
    Page(String),
}

pub fn handle(
    topic: Option<String>,
    selector: Option<String>,
    llm: bool,
    interactive: bool,
) -> Result<()> {
    let bundle = load_bundle()?;

    let req = resolve(&bundle, topic.as_deref(), selector.as_deref())?;

    if interactive {
        return launch_interactive();
    }

    
    
    let color = std::env::var_os("NO_COLOR").is_none();

    if !llm {
        print_doc_banner(color);
    }
    match req {
        Request::Intro => print!("{}", md_ansi::render(&bundle.intro, term_width(), color)),
        Request::Tree(key) => print!("{}", render_tree(&bundle, &key, color, term_width())),
        Request::Page(num) => {
            let d = bundle
                .docs
                .get(&num)
                .ok_or_else(|| anyhow!("doc {num} not found"))?;
            if llm {
                
                println!("{}", d.raw);
            } else {
                print!("{}", page_header(d, color));
                print!("{}", md_ansi::render(&d.clean, term_width(), color));
            }
        }
    }
    Ok(())
}

fn print_doc_banner(color: bool) {
    if crate::banner::stdout_color() {
        print!("\x1b[H\x1b[2J\x1b[3J");
    }
    let ver = crate::banner::version_str(&format!("v{}", ekko_core::VERSION), color);
    println!("{}  {ver}", crate::banner::inline(color));
    println!();
}

fn load_bundle() -> Result<Bundle> {
    let pkg = EklPackage::from_bytes(DOC_EKL.to_vec())
        .map_err(|e| anyhow!("corrupt embedded doc bundle: {e}"))?;
    let json = pkg
        .read_str("docs.json")
        .ok_or_else(|| anyhow!("docs.json missing from embedded doc bundle"))?;
    serde_json::from_str(&json).map_err(|e| anyhow!("invalid doc bundle: {e}"))
}

fn resolve(b: &Bundle, topic: Option<&str>, selector: Option<&str>) -> Result<Request> {
    let topic = match topic {
        None => return Ok(Request::Intro),
        Some(t) => t.trim(),
    };
    if topic.is_empty() {
        return Ok(Request::Intro);
    }

    let (head, inline_sel) = match topic.split_once('/') {
        Some((h, rest)) => (h, Some(rest.trim_matches('/').to_string())),
        None => (topic, None),
    };

    
    if inline_sel.is_none() && selector.is_none() && is_number(head) {
        let num = pad(head);
        for t in &b.topics {
            let k = format!("{}/{}", t.key, num);
            if b.docs.contains_key(&k) {
                return Ok(Request::Page(k));
            }
        }
        bail!("no doc numbered {num}. Run `ekko doc` to list topics.");
    }

    let key = alias_to_key(b, head).ok_or_else(|| unknown_topic(b, head))?;

    let sel = inline_sel.or_else(|| selector.map(|s| s.trim().to_string()));
    let sel = match sel {
        None => return Ok(Request::Tree(key)),
        Some(s) if s.is_empty() => return Ok(Request::Tree(key)),
        Some(s) => s,
    };

    if is_number(&sel) {
        let dk = format!("{}/{}", key, pad(&sel));
        return match b.docs.get(&dk) {
            Some(_) => Ok(Request::Page(dk)),
            None => bail!("no page {} in topic '{key}'. Run `ekko doc {key}` to see its pages.", pad(&sel)),
        };
    }

    let path_key = format!("{}/{}", key, sel.trim_matches('/'));
    match b.by_path.get(&path_key) {
        Some(dk) => Ok(Request::Page(dk.clone())),
        None => bail!("no page '{sel}' in topic '{key}'. Run `ekko doc {key}` to see the tree."),
    }
}

fn is_number(s: &str) -> bool {
    !s.is_empty() && s.len() <= 6 && s.chars().all(|c| c.is_ascii_digit())
}

fn pad(s: &str) -> String {
    match s.parse::<u32>() {
        Ok(n) => format!("{n:03}"),
        Err(_) => s.to_string(),
    }
}

fn alias_to_key(b: &Bundle, head: &str) -> Option<String> {
    let h = head.to_lowercase();
    b.topics
        .iter()
        .find(|t| t.key == h || t.aliases.iter().any(|a| a.to_lowercase() == h))
        .map(|t| t.key.clone())
}

fn unknown_topic(b: &Bundle, head: &str) -> anyhow::Error {
    let topics: Vec<String> = b
        .topics
        .iter()
        .map(|t| format!("{} ({})", t.key, t.aliases.join("|")))
        .collect();
    anyhow!(
        "unknown doc topic '{head}'. Available: {}. Try `ekko doc <topic>`.",
        topics.join(", ")
    )
}

fn page_header(d: &Doc, color: bool) -> String {
    let crumbs = d.crumbs.join(" › ");
    if color {
        format!(
            "\n\x1b[90m{crumbs}\x1b[0m\n\x1b[1;37m{}\x1b[0m\n\x1b[90m{}\x1b[0m\n\n",
            d.title, d.url
        )
    } else {
        format!("\n{crumbs}\n{}\n{}\n\n", d.title, d.url)
    }
}

fn render_tree(b: &Bundle, key: &str, color: bool, width: usize) -> String {
    use unicode_width::UnicodeWidthStr as UW;

    struct Item { num: Option<String>, label: String, depth: usize }
    struct Card { title: String, items: Vec<Item> }
    fn flatten(n: &TreeNode, depth: usize, out: &mut Vec<Item>) {
        out.push(Item { num: n.number.clone(), label: n.label.clone(), depth });
        for c in &n.children { flatten(c, depth + 1, out); }
    }

    let title = b.topics.iter().find(|t| t.key == key).map(|t| t.title.clone()).unwrap_or_else(|| key.to_string());
    let mut out = String::new();
    if color {
        out.push_str(&format!("\n\x1b[1;36m{title} docs\x1b[0m  \x1b[90m(open a page by its number: ekko doc {key} <NNN>  ·  ekko doc {key} -i to browse)\x1b[0m\n\n"));
    } else {
        out.push_str(&format!("\n{title} docs  (open a page by its number: ekko doc {key} <NNN> | ekko doc {key} -i to browse)\n\n"));
    }

    
    
    let mut cards: Vec<Card> = Vec::new();
    let mut lead: Vec<Item> = Vec::new();
    for n in b.trees.get(key).map(|v| v.as_slice()).unwrap_or(&[]) {
        if n.children.is_empty() {
            lead.push(Item { num: n.number.clone(), label: n.label.clone(), depth: 0 });
        } else {
            let mut direct: Vec<Item> = Vec::new();
            let mut subcards: Vec<Card> = Vec::new();
            for child in &n.children {
                if child.children.is_empty() {
                    direct.push(Item { num: child.number.clone(), label: child.label.clone(), depth: 0 });
                } else {
                    let mut items = Vec::new();
                    for gc in &child.children { flatten(gc, 0, &mut items); }
                    subcards.push(Card { title: format!("{} - {}", n.label, child.label), items });
                }
            }
            if !direct.is_empty() { cards.push(Card { title: n.label.clone(), items: direct }); }
            cards.append(&mut subcards);
        }
    }
    if !lead.is_empty() { cards.insert(0, Card { title: title.clone(), items: lead }); }
    if cards.is_empty() { out.push('\n'); return out; }

    let item_text = |it: &Item| -> String {
        let ind = "  ".repeat(it.depth);
        match &it.num { Some(n) => format!("{ind}{n}  {}", it.label), None => format!("{ind}{}", it.label) }
    };

    let mut inner = 16usize;
    for c in &cards {
        inner = inner.max(UW::width(c.title.as_str()) + 2);
        for it in &c.items { inner = inner.max(UW::width(item_text(it).as_str())); }
    }
    inner = inner.min(width.saturating_sub(4)).min(42).max(12);
    let outer = inner + 4; 
    let cols = ((width + 1) / (outer + 1)).max(1);

    let fit = |s: &str, w: usize| -> String {
        let vw = UW::width(s);
        if vw <= w { return format!("{}{}", s, " ".repeat(w - vw)); }
        let mut acc = String::new(); let mut cw = 0;
        for ch in s.chars() { let c = UW::width(&*ch.to_string()); if cw + c > w.saturating_sub(1) { break; } acc.push(ch); cw += c; }
        acc.push('…');
        let aw = UW::width(acc.as_str());
        if aw < w { acc.push_str(&" ".repeat(w - aw)); }
        acc
    };

    let render_card = |c: &Card| -> Vec<String> {
        let mut lines = Vec::new();
        let ttl = fit(&c.title, outer.saturating_sub(6));
        let ttl = ttl.trim_end().to_string();
        let tw = UW::width(ttl.as_str());
        let dashes = outer.saturating_sub(tw + 5);
        if color {
            lines.push(format!("\x1b[90m╭─ \x1b[1;36m{ttl}\x1b[0m \x1b[90m{}╮\x1b[0m", "─".repeat(dashes)));
        } else {
            lines.push(format!("╭─ {ttl} {}╮", "─".repeat(dashes)));
        }
        for it in &c.items {
            let bp = fit(&item_text(it), inner);
            let body = if color {
                match &it.num {
                    Some(n) => {
                        let start = "  ".repeat(it.depth).len();
                        let end = start + n.len();
                        if end <= bp.len() && bp.is_char_boundary(start) && bp.is_char_boundary(end) {
                            format!("{}\x1b[32m{}\x1b[0m{}", &bp[..start], &bp[start..end], &bp[end..])
                        } else { bp.clone() }
                    }
                    None => format!("\x1b[1;94m{bp}\x1b[0m"), 
                }
            } else { bp };
            if color { lines.push(format!("\x1b[90m│\x1b[0m {body} \x1b[90m│\x1b[0m")); }
            else { lines.push(format!("│ {body} │")); }
        }
        if color { lines.push(format!("\x1b[90m╰{}╯\x1b[0m", "─".repeat(outer - 2))); }
        else { lines.push(format!("╰{}╯", "─".repeat(outer - 2))); }
        lines
    };

    let mut col_lines: Vec<Vec<String>> = vec![Vec::new(); cols];
    let mut heights = vec![0usize; cols];
    for c in &cards {
        let ci = (0..cols).min_by_key(|&i| heights[i]).unwrap_or(0);
        let card = render_card(c);
        let n = card.len();
        for l in card { col_lines[ci].push(l); }
        col_lines[ci].push(" ".repeat(outer));
        heights[ci] += n + 1;
    }
    let maxh = heights.iter().copied().max().unwrap_or(0);
    let blank = " ".repeat(outer);
    for r in 0..maxh {
        let mut row = String::new();
        for ci in 0..cols {
            if ci > 0 { row.push(' '); }
            row.push_str(col_lines[ci].get(r).unwrap_or(&blank));
        }
        out.push_str(row.trim_end_matches(' '));
        out.push('\n');
    }
    out
}

fn term_width() -> usize {
    crossterm::terminal::size()
        .map(|(c, _)| c as usize)
        .unwrap_or(100)
        .clamp(40, 120)
}

fn launch_interactive() -> Result<()> {
    use ekko_core::engine::v8_runtime::{set_app_root, AppRoot};

    let bytes = DOC_EKL.to_vec();
    let pkg =
        EklPackage::from_bytes(bytes.clone()).map_err(|e| anyhow!("corrupt doc bundle: {e}"))?;
    let name = pkg.metadata.name.clone();
    let entry = pkg
        .metadata
        .entry
        .clone()
        .ok_or_else(|| anyhow!("doc bundle has no entry"))?;

    ekko_core::module_loader::vfs_registry().load_package_from_bytes(bytes)?;

    
    
    let tmp = std::env::temp_dir();
    set_app_root(AppRoot {
        vfs_package: Some(name.clone()),
        read_root: tmp.clone(),
        write_root: tmp,
        own_reads_exempt: true,
        virtual_root: Some(format!("ekl:///{name}")),
    });

    
    let color = crate::banner::stdout_color();
    let banner = format!(
        "\x1b[H\x1b[2J\x1b[3J{}  {}\r\nGood bye\r\n",
        crate::banner::inline(color),
        crate::banner::version_str(&format!("v{}", ekko_core::VERSION), color),
    );
    ekko_core::bridges::tui_bridge::set_exit_banner(Some(banner));

    let src = ekko_core::module_loader::vfs_registry()
        .read_module(&name, &entry)
        .ok_or_else(|| anyhow!("entry '{entry}' not found in doc bundle"))?;
    ekko_tui::run_from_vfs((*src).clone(), format!("ekl:///{name}/{entry}"), name)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doc(topic: &str, num: &str) -> Doc {
        Doc {
            topic: topic.into(),
            number: num.into(),
            title: format!("Doc {num}"),
            crumbs: vec!["Docs".into()],
            url: format!("https://x/{num}"),
            clean: format!("# Doc {num}\n\nbody"),
            raw: format!("# Doc {num}\n\n```mermaid\nx\n```"),
        }
    }

    fn bundle() -> Bundle {
        let mut docs = HashMap::new();
        docs.insert("js/001".into(), doc("js", "001"));
        docs.insert("ru/075".into(), doc("ru", "075"));
        let mut by_path = HashMap::new();
        by_path.insert("js/getting-started".into(), "js/001".into());
        by_path.insert("ru/overview".into(), "ru/075".into());
        let mut trees = HashMap::new();
        trees.insert(
            "ru".into(),
            vec![TreeNode {
                label: "Intro".into(),
                number: None,
                children: vec![TreeNode {
                    label: "Overview".into(),
                    number: Some("075".into()),
                    children: vec![],
                }],
            }],
        );
        Bundle {
            topics: vec![
                Topic { key: "js".into(), aliases: vec!["js".into(), "ekkojs".into()], title: "EkkoJS".into() },
                Topic { key: "ru".into(), aliases: vec!["ru".into(), "rune".into()], title: "Rune".into() },
            ],
            trees,
            docs,
            by_path,
            intro: "# Intro".into(),
        }
    }

    fn req_kind(r: &Request) -> String {
        match r {
            Request::Intro => "intro".into(),
            Request::Tree(k) => format!("tree:{k}"),
            Request::Page(n) => format!("page:{n}"),
        }
    }

    #[test]
    fn no_topic_is_intro() {
        assert_eq!(req_kind(&resolve(&bundle(), None, None).unwrap()), "intro");
    }

    #[test]
    fn topic_alias_maps_to_key_and_tree() {
        let b = bundle();
        assert_eq!(req_kind(&resolve(&b, Some("rune"), None).unwrap()), "tree:ru");
        assert_eq!(req_kind(&resolve(&b, Some("ekkojs"), None).unwrap()), "tree:js");
    }

    #[test]
    fn page_by_path_slash_and_space() {
        let b = bundle();
        assert_eq!(req_kind(&resolve(&b, Some("ru/overview"), None).unwrap()), "page:ru/075");
        assert_eq!(req_kind(&resolve(&b, Some("ru"), Some("overview")).unwrap()), "page:ru/075");
    }

    #[test]
    fn page_by_number_topic_scoped_and_global() {
        let b = bundle();
        assert_eq!(req_kind(&resolve(&b, Some("ru"), Some("75")).unwrap()), "page:ru/075");
        
        assert_eq!(req_kind(&resolve(&b, Some("075"), None).unwrap()), "page:ru/075");
        
        assert!(resolve(&b, Some("js"), Some("075")).is_err());
    }

    #[test]
    fn unknown_topic_errors_with_list() {
        let err = resolve(&bundle(), Some("nope"), None).unwrap_err().to_string();
        assert!(err.contains("unknown doc topic"));
        assert!(err.contains("js") && err.contains("ru"));
    }

    #[test]
    fn unknown_page_errors() {
        assert!(resolve(&bundle(), Some("ru"), Some("missing")).is_err());
        assert!(resolve(&bundle(), Some("999"), None).is_err());
    }

    #[test]
    fn tree_renders_numbers_and_groups() {
        let out = render_tree(&bundle(), "ru", false, 80);
        assert!(out.contains("Rune docs"));
        assert!(out.contains("Intro")); 
        assert!(out.contains("075") && out.contains("Overview")); 
    }

    #[test]
    fn pad_zero_fills() {
        assert_eq!(pad("75"), "075");
        assert_eq!(pad("075"), "075");
        assert_eq!(pad("1"), "001");
    }
}
