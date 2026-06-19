// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use clap::{Arg, ArgAction, Command};
use unicode_width::UnicodeWidthStr;

fn w(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

fn term_width() -> usize {
    crossterm::terminal::size()
        .map(|(c, _)| c as usize)
        .unwrap_or(100)
        .clamp(40, 120)
}

fn wrap_text(text: &str, width: usize) -> Vec<String> {
    let width = width.max(8);
    let mut lines = Vec::new();
    let mut cur = String::new();
    let mut cur_w = 0;
    for word in text.split_whitespace() {
        let ww = w(word);
        if cur.is_empty() {
            cur.push_str(word);
            cur_w = ww;
        } else if cur_w + 1 + ww <= width {
            cur.push(' ');
            cur.push_str(word);
            cur_w += 1 + ww;
        } else {
            lines.push(std::mem::take(&mut cur));
            cur.push_str(word);
            cur_w = ww;
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

fn push_desc(out: &mut String, desc: &str, desc_col: usize, width: usize, color: &str, reset: &str) {
    let avail = width.saturating_sub(desc_col).max(16);

    
    let mut first = true;
    for logical in desc.split('\n') {
        let mut lines = wrap_text(logical, avail);
        if lines.is_empty() {
            lines.push(String::new());
        }
        for line in &lines {
            if first {
                out.push_str(&format!("{color}{line}{reset}\n"));
                first = false;
            } else {
                out.push_str(&format!("{}{color}{line}{reset}\n", " ".repeat(desc_col)));
            }
        }
    }
}

struct Palette {
    u_usage: &'static str, 
    u_cmds: &'static str,  
    u_args: &'static str,  
    u_opts: &'static str,  
    ekko: &'static str,    
    name: &'static str,    
    val: &'static str,     
    desc: &'static str,    
    desc_alt: &'static str,
                           
    r: &'static str,       
}

const ON: Palette = Palette {
    u_usage: "\x1b[4;38;2;88;166;255m",
    u_cmds: "\x1b[4;35m",
    u_args: "\x1b[4;36m",
    u_opts: "\x1b[4;33m",
    ekko: "\x1b[38;2;61;214;168m",
    name: "\x1b[3;97m",
    val: "\x1b[36m",
    desc: "\x1b[38;2;120;170;130m",
    desc_alt: "\x1b[38;2;61;214;168m",
    r: "\x1b[0m",
};
const OFF: Palette = Palette {
    u_usage: "", u_cmds: "", u_args: "", u_opts: "", ekko: "", name: "", val: "", desc: "", desc_alt: "", r: "",
};

fn flag_label(a: &Arg) -> String {
    let mut s = String::new();
    if let Some(sh) = a.get_short() {
        s.push('-');
        s.push(sh);
        if a.get_long().is_some() {
            s.push_str(", ");
        }
    }
    if let Some(lo) = a.get_long() {
        s.push_str("--");
        s.push_str(lo);
    }
    if matches!(a.get_action(), ArgAction::Set | ArgAction::Append) {
        let vn = a
            .get_value_names()
            .and_then(|v| v.first().map(|x| x.to_string()))
            .unwrap_or_else(|| a.get_id().as_str().to_uppercase());
        s.push_str(&format!(" <{vn}>"));
    }
    s
}

fn positional_label(a: &Arg) -> String {
    let name = a
        .get_value_names()
        .and_then(|v| v.first().map(|x| x.to_string()))
        .unwrap_or_else(|| a.get_id().as_str().to_uppercase());
    if a.is_required_set() { format!("<{name}>") } else { format!("[{name}]") }
}

fn section_commands(out: &mut String, p: &Palette, width: usize, subs: &[&Command]) {
    if subs.is_empty() {
        return;
    }
    let name_w = subs.iter().map(|c| w(c.get_name())).max().unwrap_or(0);
    out.push_str(&format!("{}Commands:{}\n", p.u_cmds, p.r));
    let desc_col = 2 + name_w + 2;
    for (i, c) in subs.iter().enumerate() {
        let n = c.get_name();
        let about = c.get_about().map(|s| s.to_string()).unwrap_or_default();
        let about = about.lines().next().unwrap_or("");
        let pad = name_w - w(n) + 2;
        let dc = if i % 2 == 0 { p.desc } else { p.desc_alt };
        out.push_str(&format!("  {}{n}{}{}", p.name, p.r, " ".repeat(pad)));
        push_desc(out, about, desc_col, width, dc, p.r);
    }
    out.push('\n');
}

fn section_arguments(out: &mut String, p: &Palette, width: usize, args: &[&Arg]) {
    if args.is_empty() {
        return;
    }
    let labels: Vec<String> = args.iter().map(|a| positional_label(a)).collect();
    let name_w = labels.iter().map(|l| w(l)).max().unwrap_or(0);
    out.push_str(&format!("{}Arguments:{}\n", p.u_args, p.r));
    let desc_col = 2 + name_w + 2;
    for (i, (a, label)) in args.iter().zip(&labels).enumerate() {
        let h = a.get_help().map(|s| s.to_string()).unwrap_or_default();
        let pad = name_w - w(label) + 2;
        let dc = if i % 2 == 0 { p.desc } else { p.desc_alt };
        out.push_str(&format!("  {}{label}{}{}", p.val, p.r, " ".repeat(pad)));
        push_desc(out, &h, desc_col, width, dc, p.r);
    }
    out.push('\n');
}

fn section_options(out: &mut String, p: &Palette, width: usize, opts: &[&Arg]) {
    if opts.is_empty() {
        return;
    }
    let labels: Vec<String> = opts.iter().map(|a| flag_label(a)).collect();
    let flag_w = labels.iter().map(|l| w(l)).max().unwrap_or(0);
    out.push_str(&format!("{}Options:{}\n", p.u_opts, p.r));
    let desc_col = 2 + flag_w + 2;
    for (i, (a, label)) in opts.iter().zip(&labels).enumerate() {
        let h = a.get_help().map(|s| s.to_string()).unwrap_or_default();
        let pad = flag_w - w(label) + 2;
        let dc = if i % 2 == 0 { p.desc } else { p.desc_alt };
        out.push_str(&format!("  {}{label}{}{}", p.name, p.r, " ".repeat(pad)));
        push_desc(out, &h, desc_col, width, dc, p.r);
    }
}

pub fn render_root(cmd: &Command, color: bool) -> String {
    let p = if color { &ON } else { &OFF };
    let width = term_width();
    let mut out = String::new();

    out.push_str(&format!("{}Usage:{} {}ekko{} {}[COMMAND]{}\n", p.u_usage, p.r, p.ekko, p.r, p.val, p.r));
    let examples = [
        format!("{}ekko{} {}run{} {}app.ts{} {}--allow{}{}=fs,net{}", p.ekko, p.r, p.name, p.r, p.val, p.r, p.name, p.r, p.val, p.r),
        format!("{}ekko{} {}ekl ls{}", p.ekko, p.r, p.name, p.r),
    ];
    for ex in &examples {
        out.push_str(&format!("       {ex}\n"));
    }
    out.push('\n');

    let subs: Vec<&Command> = cmd.get_subcommands().filter(|c| !c.is_hide_set() && c.get_name() != "help").collect();
    section_commands(&mut out, p, width, &subs);

    let opts: Vec<&Arg> = cmd.get_arguments().filter(|a| !a.is_hide_set() && a.is_positional() == false).collect();
    section_options(&mut out, p, width, &opts);
    out
}

pub fn render_command(cmd: &Command, invocation: &str, color: bool) -> String {
    let p = if color { &ON } else { &OFF };
    let width = term_width();
    let mut out = String::new();

    if let Some(about) = cmd.get_long_about().or_else(|| cmd.get_about()) {
        let text = about.to_string().replace('\n', " ");
        for line in wrap_text(&text, width.max(20)) {
            out.push_str(&format!("{}{}{}\n", p.desc, line, p.r));
        }
        out.push('\n');
    }

    let opts: Vec<&Arg> = cmd.get_arguments().filter(|a| !a.is_hide_set() && !a.is_positional()).collect();
    let positionals: Vec<&Arg> = cmd.get_positionals().filter(|a| !a.is_hide_set()).collect();
    let subs: Vec<&Command> = cmd.get_subcommands().filter(|c| !c.is_hide_set() && c.get_name() != "help").collect();

    let (head, tail) = invocation.split_once(' ').unwrap_or((invocation, ""));
    let mut usage = format!("{}Usage:{} {}{head}{}", p.u_usage, p.r, p.ekko, p.r);
    if !tail.is_empty() {
        usage.push_str(&format!(" {}{tail}{}", p.name, p.r));
    }
    if !opts.is_empty() {
        usage.push_str(&format!(" {}[OPTIONS]{}", p.val, p.r));
    }
    for a in &positionals {
        usage.push_str(&format!(" {}{}{}", p.val, positional_label(a), p.r));
    }
    if !subs.is_empty() {
        usage.push_str(&format!(" {}[COMMAND]{}", p.val, p.r));
    }
    out.push_str(&usage);
    out.push_str("\n\n");

    section_arguments(&mut out, p, width, &positionals);
    section_commands(&mut out, p, width, &subs);
    section_options(&mut out, p, width, &opts);
    out
}
