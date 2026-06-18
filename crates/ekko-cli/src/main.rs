// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

use clap::{Parser, Subcommand};
use std::collections::HashMap;
use std::path::PathBuf;
use walkdir;

mod repl;
mod img;
mod banner;
mod help;
mod doc;

struct Spinner {
    done: std::sync::Arc<std::sync::atomic::AtomicBool>,
    handle: Option<std::thread::JoinHandle<()>>,
}
impl Spinner {
    fn start(label: &str) -> Self {
        use std::io::Write;
        let done = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let d = done.clone();
        let label = label.to_string();
        let color = std::env::var_os("NO_COLOR").is_none();
        let handle = std::thread::spawn(move || {
            let (g, dim, r) = if color { ("\x1b[38;2;61;214;168m", "\x1b[2m", "\x1b[0m") } else { ("", "", "") };
            let width: i32 = 22;
            let block: i32 = 5;
            let (mut pos, mut dir) = (0i32, 1i32);
            while !d.load(std::sync::atomic::Ordering::Relaxed) {
                let mut bar = String::new();
                for i in 0..width { bar.push(if i >= pos && i < pos + block { '█' } else { '░' }); }
                eprint!("\r    {g}{label}{r}  {dim}[{g}{bar}{dim}]{r}");
                let _ = std::io::stderr().flush();
                std::thread::sleep(std::time::Duration::from_millis(70));
                pos += dir;
                if pos + block >= width || pos <= 0 { dir = -dir; }
            }
        });
        Spinner { done, handle: Some(handle) }
    }
    fn finish(mut self) {
        use std::io::Write;
        self.done.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(h) = self.handle.take() { let _ = h.join(); }
        eprint!("\r\x1b[2K"); 
        let _ = std::io::stderr().flush();
    }
}

fn cli_styles() -> clap::builder::Styles {
    use clap::builder::styling::{AnsiColor, Color, RgbColor, Style, Styles};
    let white = Style::new().fg_color(Some(Color::Ansi(AnsiColor::White))).italic(); 
    let magenta = Style::new().fg_color(Some(Color::Ansi(AnsiColor::Magenta))).underline(); 
    let blue = Style::new().fg_color(Some(Color::Rgb(RgbColor(88, 166, 255)))).underline(); 
    let cyan = Style::new().fg_color(Some(Color::Ansi(AnsiColor::Cyan))); 
    Styles::styled()
        .header(magenta)
        .usage(blue)
        .literal(white)
        .placeholder(cyan)
}

#[derive(Parser)]
#[command(name = "ekko", version = ekko_core::VERSION, about = "EkkoJS Runtime", styles = cli_styles())]
struct Cli {
    
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {

    #[command(visible_alias = "x")]
    Run {

        
        file: Option<PathBuf>,
        
        #[arg(short, long)]
        path: Option<PathBuf>,
        
        #[arg(long = "ekl")]
        ekl: Option<PathBuf>,
        
        #[arg(long = "root", visible_alias = "root-path")]
        root: Option<PathBuf>,
        
        #[arg(long = "allow", value_delimiter = ',')]
        allow: Vec<String>,

        
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        script_args: Vec<String>,
    },
    
    Eval {
        
        code: String,
    },

    
    Doc {
        
        topic: Option<String>,
        
        selector: Option<String>,
        
        #[arg(long)]
        llm: bool,
        
        #[arg(short = 'i', long)]
        interactive: bool,
    },
    
    Repl {
        
        #[arg(long = "allow", value_delimiter = ',')]
        allow: Vec<String>,
    },
    
    Test {
        
        files: Vec<PathBuf>,
        
        #[arg(long)]
        coverage: bool,
        
        #[arg(long, value_delimiter = ',')]
        include: Vec<String>,
        
        #[arg(long, value_delimiter = ',')]
        exclude: Vec<String>,
        
        #[arg(long = "ekl")]
        ekl_files: Vec<PathBuf>,
    },
    
    Build {
        
        member: Option<PathBuf>,
        
        #[arg(long)]
        all: bool,
        
        #[arg(long)]
        client: bool,
        
        #[arg(long)]
        server: bool,
    },
    
    Pack {
        
        member: Option<PathBuf>,
        
        #[arg(long)]
        all: bool,
    },
    
    Add {

        package: Option<String>,
        
        #[arg(long)]
        build: bool,
        
        #[arg(short = 's', long)]
        store: bool,

        #[arg(long)]
        ekl: bool,
        
        #[arg(long = "ekl-path", visible_alias = "ep", requires = "ekl")]
        ekl_path: Option<String>,
        
        #[arg(long = "ekl-deps", visible_alias = "ed", requires = "ekl")]
        ekl_deps: bool,
        
        #[arg(long = "ekl-arch", visible_alias = "ea", requires = "ekl", value_delimiter = ',')]
        ekl_arch: Vec<String>,
        
        #[arg(long = "ekl-platform", visible_alias = "epl", requires = "ekl", value_delimiter = ',')]
        ekl_platform: Vec<String>,
    },
    
    Remove {
        
        package: String,
        
        #[arg(short = 's', long)]
        store: bool,
    },
    
    Publish {
        
        #[arg(long)]
        dry_run: bool,
        
        #[arg(long)]
        tag: Option<String>,

        #[arg(long = "allow-private-on-public")]
        allow_private_on_public: bool,
    },
    
    Search {
        
        query: String,
        
        #[arg(long, default_value = "20")]
        limit: usize,
    },
    
    List,
    
    Check {
        
        files: Vec<PathBuf>,
    },
    
    Dev {
        
        #[arg(default_value = "server.tsx")]
        file: PathBuf,
        
        #[arg(long)]
        port: Option<u16>,

        #[arg(long = "allow", value_delimiter = ',')]
        allow: Vec<String>,
    },
    
    Init {
        
        kind: Option<String>,
        
        name_pos: Option<String>,
        
        #[arg(short, long)]
        path: Option<PathBuf>,
        
        #[arg(long)]
        name: Option<String>,
        
        #[arg(long)]
        demo: bool,
    },

    

    Ekl {
        #[command(subcommand)]
        command: EklCommands,
    },
    
    Img {
        #[command(subcommand)]
        command: ImgCommands,
    },
    
    Auth {
        #[command(subcommand)]
        command: AuthCommands,
    },
}

#[derive(Subcommand)]
enum AuthCommands {
    
    Status,

    Token {
        #[arg(long)]
        token: Option<String>,
        
        #[arg(long)]
        registry: Option<String>,
    },
    
    Cert {
        path: String,
    },
    
    Switch {
        name: String,
    },
    
    Logout,
}

#[derive(Subcommand)]
enum ImgCommands {
    
    Info {
        input: String,
        
        #[arg(long)]
        json: bool,
    },
    
    Convert {
        input: String,
        output: String,
        #[arg(long)]
        format: Option<String>,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Compress {
        input: String,
        output: Option<String>,
        #[arg(long)]
        format: Option<String>,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Resize {
        input: String,
        output: String,
        #[arg(long)]
        width: Option<u32>,
        #[arg(long)]
        height: Option<u32>,
        
        #[arg(long, default_value = "exact")]
        fit: String,
        #[arg(long, default_value = "lanczos3")]
        filter: String,
        #[arg(long)]
        format: Option<String>,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Thumbnail {
        input: String,
        output: String,
        #[arg(long)]
        width: u32,
        #[arg(long)]
        height: u32,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Crop {
        input: String,
        output: String,
        #[arg(long)]
        x: u32,
        #[arg(long)]
        y: u32,
        #[arg(long)]
        width: u32,
        #[arg(long)]
        height: u32,
        #[arg(short, long)]
        force: bool,
    },
    
    Rotate {
        input: String,
        output: String,
        #[arg(long)]
        degrees: u32,
        #[arg(short, long)]
        force: bool,
    },
    
    Flip {
        input: String,
        output: String,
        #[arg(long)]
        horizontal: bool,
        #[arg(long)]
        vertical: bool,
        #[arg(short, long)]
        force: bool,
    },
    
    Grayscale {
        input: String,
        output: String,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Blur {
        input: String,
        output: String,
        #[arg(long)]
        sigma: f32,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Brighten {
        input: String,
        output: String,
        #[arg(long)]
        value: i32,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
    
    Edit {
        input: String,
        output: String,
        
        #[arg(long)]
        resize: Option<String>,
        
        #[arg(long)]
        crop: Option<String>,
        #[arg(long)]
        rotate: Option<u32>,
        
        #[arg(long)]
        flip: Option<String>,
        #[arg(long)]
        grayscale: bool,
        #[arg(long)]
        blur: Option<f32>,
        #[arg(long)]
        brighten: Option<i32>,
        #[arg(long)]
        format: Option<String>,
        #[arg(short, long)]
        quality: Option<u8>,
        #[arg(short, long)]
        force: bool,
    },
}

#[allow(dead_code)]
#[derive(Subcommand)]
enum GuiCommands {
    
    Run {
        
        package: Option<String>,
        
        #[arg(short, long)]
        path: Option<PathBuf>,
        
        #[arg(long = "ekl")]
        ekl: Option<PathBuf>,
    },
    
    Dev {
        
        #[arg(short, long)]
        path: Option<PathBuf>,
    },
}

#[allow(dead_code)]
#[derive(Subcommand)]
enum TuiCommands {
    
    Run {
        
        package: Option<String>,
        
        #[arg(short, long)]
        path: Option<PathBuf>,
        
        #[arg(long = "ekl")]
        ekl: Option<PathBuf>,
    },
    
    Dev {
        
        #[arg(short, long)]
        path: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum EklCommands {
    
    Inspect {
        
        target: String,
    },
    
    #[command(alias = "list")]
    Ls,
    
    Store {
        #[command(subcommand)]
        command: EklStoreCommands,
    },
}

#[derive(Subcommand)]
enum EklStoreCommands {
    
    Set {
        
        path: PathBuf,
    },
    
    Clear,
    
    Move {
        
        path: PathBuf,
    },
}

fn install_crash_handler() {
    std::panic::set_hook(Box::new(|info| {
        
        ekko_core::engine::v8_runtime::PANIC_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let loc = info.location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "<unknown>".to_string());
        let msg = info.payload().downcast_ref::<&str>().map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "<non-string panic payload>".to_string());
        let thread = std::thread::current().name().unwrap_or("<unnamed>").to_string();
        let bt = std::backtrace::Backtrace::force_capture();
        eprintln!("\n\x1b[1;31m[ekko] FATAL: runtime panic\x1b[0m");
        eprintln!("  version:  {}", ekko_core::VERSION);
        eprintln!("  location: {loc}");
        eprintln!("  thread:   {thread}");
        eprintln!("  message:  {msg}");
        eprintln!("  This is a bug in the EkkoJS runtime. Please report it with the trace below.");
        eprintln!("\n--- backtrace ---\n{bt}");
    }));
}

#[cfg(windows)]
fn enable_utf8_console() {
    use std::os::raw::c_void;
    const CP_UTF8: u32 = 65001;
    const STD_OUTPUT_HANDLE: u32 = 0xFFFF_FFF5; 
    const ENABLE_VIRTUAL_TERMINAL_PROCESSING: u32 = 0x0004;
    unsafe extern "system" {
        fn SetConsoleOutputCP(code_page: u32) -> i32;
        fn GetStdHandle(std_handle: u32) -> *mut c_void;
        fn GetConsoleMode(handle: *mut c_void, mode: *mut u32) -> i32;
        fn SetConsoleMode(handle: *mut c_void, mode: u32) -> i32;
    }
    unsafe {
        SetConsoleOutputCP(CP_UTF8);
        let h = GetStdHandle(STD_OUTPUT_HANDLE);
        if !h.is_null() && h as isize != -1 {
            let mut mode = 0u32;
            if GetConsoleMode(h, &mut mode) != 0 {
                SetConsoleMode(h, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
            }
        }
    }
}
#[cfg(not(windows))]
fn enable_utf8_console() {}

fn main() -> anyhow::Result<()> {
    enable_utf8_console();
    install_crash_handler();
    
    let _ = ekko_core::engine::v8_runtime::PROCESS_START.elapsed();

    if std::env::var_os("EKKO_CRASH_SELFTEST").is_some() {
        panic!("crash-handler self-test (EKKO_CRASH_SELFTEST)");
    }

    {
        let raw: Vec<String> = std::env::args().collect();
        let color = banner::stdout_color();
        if raw.len() == 2 && (raw[1] == "--version" || raw[1] == "-V" || raw[1] == "-v") {
            let ver = banner::version_str(&format!("v{}", ekko_core::VERSION), color);
            println!("{}  {ver}", banner::inline(color));
            return Ok(());
        }
        
        if raw.len() == 1 {
            return print_root_help();
        }

        let mut root = <Cli as clap::CommandFactory>::command();
        root.build();
        if let Some((target, invocation)) = resolve_help_target(&root, &raw) {
            if target.get_name() == root.get_name() {
                return print_root_help();
            }
            return print_command_help(target, &invocation, color);
        }
    }
    
    let argv = normalize_run_argv(std::env::args().collect());
    let cli = match Cli::try_parse_from(argv.clone()) {
        Ok(c) => c,
        Err(e) => return handle_parse_error(e, &argv),
    };

    match cli.command {

        Some(Commands::Ekl { command }) => handle_ekl_command(command),
        Some(Commands::Img { command }) => img::handle_img_command(command),
        Some(Commands::Auth { command }) => handle_auth_command(command),

        
        
        Some(Commands::Run { file, path, ekl, root, allow, script_args }) =>
            dispatch_run(file, path, ekl, root, allow, script_args),

        
        Some(Commands::Doc { topic, selector, llm, interactive }) =>
            doc::handle(topic, selector, llm, interactive),

        None => print_root_help(),

        cmd => {
            let rt = tokio::runtime::Builder::new_multi_thread()
                .enable_all()

                .thread_stack_size(8 * 1024 * 1024)
                .build()?;
            rt.block_on(async move {
                match cmd {
                    Some(c) => run_command(c).await,
                    None => unreachable!("None handled above"),
                }
            })
        }
    }
}

fn build_runtime() -> anyhow::Result<tokio::runtime::Runtime> {
    Ok(tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_stack_size(8 * 1024 * 1024)
        .build()?)
}

fn print_command_help(target: &clap::Command, invocation: &str, color: bool) -> anyhow::Result<()> {
    if color { print!("\x1b[H\x1b[2J\x1b[3J"); } 
    let ver = banner::version_str(&format!("v{}", ekko_core::VERSION), color);
    println!("{}  {ver}", banner::inline(color)); 
    println!();
    print!("{}", help::render_command(target, invocation, color));
    Ok(())
}

fn handle_parse_error(e: clap::Error, argv: &[String]) -> anyhow::Result<()> {
    use clap::error::ErrorKind;
    match e.kind() {
        ErrorKind::DisplayHelp
        | ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand
        | ErrorKind::MissingSubcommand => {
            let color = banner::stdout_color();
            let mut root = <Cli as clap::CommandFactory>::command();
            root.build();
            
            let path: Vec<&str> = argv.iter().skip(1).map(|s| s.as_str()).filter(|t| *t != "help").collect();
            let (target, invocation) = walk_subcommands(&root, &path);
            if target.get_name() == root.get_name() {
                print_root_help()
            } else {
                print_command_help(target, &invocation, color)
            }
        }

        _ => e.exit(),
    }
}

fn walk_subcommands<'a>(root: &'a clap::Command, path: &[&str]) -> (&'a clap::Command, String) {
    let mut cur = root;
    let mut names = vec![root.get_name().to_string()];
    for t in path {
        if t.starts_with('-') { continue; }
        match cur.find_subcommand(t) {
            Some(sub) => { cur = sub; names.push(sub.get_name().to_string()); }
            None => break, 
        }
    }
    (cur, names.join(" "))
}

fn resolve_help_target<'a>(root: &'a clap::Command, args: &[String]) -> Option<(&'a clap::Command, String)> {
    let toks: Vec<&str> = args.iter().skip(1).map(|s| s.as_str()).collect();
    
    if let Some(fp) = toks.iter().position(|t| *t == "-h" || *t == "--help") {
        return Some(walk_subcommands(root, &toks[..fp]));
    }
    
    if toks.first() == Some(&"help") {
        return Some(walk_subcommands(root, &toks[1..]));
    }

    if toks.last() == Some(&"help") {
        let (cur, inv) = walk_subcommands(root, &toks[..toks.len() - 1]);
        if cur.get_subcommands().next().is_some() {
            return Some((cur, inv));
        }
    }
    None
}

fn print_root_help() -> anyhow::Result<()> {
    let color = banner::stdout_color();
    if color { print!("\x1b[H\x1b[2J\x1b[3J"); } 
    print!("{}", banner::help_card(&format!("v{}", ekko_core::VERSION), color));
    println!();
    
    let mut cmd = <Cli as clap::CommandFactory>::command();
    cmd.build();
    print!("{}", help::render_root(&cmd, color));
    Ok(())
}

fn normalize_run_argv(mut argv: Vec<String>) -> Vec<String> {
    const SUBS: &[&str] = &[
        "run", "eval", "repl", "test", "build", "pack", "add", "remove", "publish",
        "search", "list", "check", "dev", "x", "init", "ekl", "img", "auth", "help", "doc",
    ];
    if argv.len() >= 2 {
        let a = &argv[1];
        if !a.starts_with('-') && !SUBS.contains(&a.as_str()) {
            argv.insert(1, "run".to_string());
        }
    }
    argv
}

async fn run_command(command: Commands) -> anyhow::Result<()> {
    match command {

        Commands::Run { .. } => unreachable!("Commands::Run is dispatched by dispatch_run() in main()"),
        Commands::Doc { .. } => unreachable!("Commands::Doc is dispatched synchronously in main()"),
        Commands::Eval { code } => {
            ekko_core::engine::v8_runtime::set_permissions(ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());

            match ekko_core::engine::v8_runtime::execute_script_async(&code).await {
                Ok(r) => {
                    println!("{}", r);
                    Ok(())
                }
                Err(e) => {
                    eprintln!("error: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Repl { allow } => repl::run_repl(allow).await,
        Commands::Init { kind, name_pos, path, name, demo } => init_project(kind, path, name.or(name_pos), demo).await,
        Commands::Test { files: cli_files, coverage, include, exclude, ekl_files } => {
            ekko_core::engine::v8_runtime::set_permissions(ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            for ekl in &ekl_files {
                if let Err(e) = ekko_core::module_loader::vfs_registry().load_package(ekl) {
                    eprintln!("error loading .ekl '{}': {}", ekl.display(), e);
                    std::process::exit(1);
                }
            }
            let files: Vec<PathBuf> = if !cli_files.is_empty() {
                for f in &cli_files {
                    if !f.exists() {
                        anyhow::bail!("test file not found: {}", f.display());
                    }
                }
                cli_files
            } else {
                let mut found: Vec<PathBuf> = Vec::new();
                for pattern in ["**/*.test.ts", "**/*.test.js"] {
                    if let Ok(paths) = glob::glob(pattern) {
                        for entry in paths.flatten() {
                            found.push(entry);
                        }
                    }
                }
                found.sort();
                found
            };

            if files.is_empty() {
                println!("No test files found");
                return Ok(());
            }

            println!("=== EkkoJS Test Runner ===");
            println!("Found {} test file(s)\n", files.len());

            let mut sources: std::collections::HashMap<String, String> = std::collections::HashMap::new();
            let original_dir = std::env::current_dir().unwrap_or_default();

            let abs_files: Vec<PathBuf> = files.iter()
                .map(|f| std::fs::canonicalize(f).unwrap_or(f.clone()))
                .collect();

            let mut all_scripts: Vec<ekko_core::tooling::coverage::ScriptCoverage> = Vec::new();
            let mut any_failed = false;
            for f in &abs_files {
                println!("── {} ──", f.file_name().unwrap_or_default().to_string_lossy());
                
                let _ = std::env::set_current_dir(&original_dir);

                if coverage {
                    let source = std::fs::read_to_string(f).unwrap_or_default();
                    let file_id = f.to_string_lossy().to_string();
                    sources.insert(file_id.clone(), source.clone());

                    let filename = f.to_string_lossy().to_string();
                    let code = if ekko_core::parsers::swc_transform::needs_transpile(&filename) {
                        ekko_core::parsers::swc_transform::transpile(&source, &filename).unwrap_or(source)
                    } else { source };

                    if let Some(parent) = f.parent() {
                        if parent.exists() { let _ = std::env::set_current_dir(parent); }
                    }

                    match ekko_core::engine::v8_runtime::execute_module_with_coverage(&code, &filename).await {
                        Ok(cov) => { all_scripts.extend(cov); }
                        Err(e) => { eprintln!("  error: {}", e); any_failed = true; }
                    }
                } else {
                    if let Err(e) = run_file(f).await {
                        eprintln!("  error: {}", e);
                        any_failed = true;
                    }
                }
                println!();
            }

            if coverage {
                use ekko_core::tooling::coverage;
                let _ = std::env::set_current_dir(&original_dir);

                let (cfg_inc, cfg_exc) = coverage::read_config(&original_dir);
                let inc_patterns: Vec<String> = if include.is_empty() { cfg_inc } else { include };
                let exc_patterns: Vec<String> = if exclude.is_empty() { cfg_exc } else { exclude };

                let source_files = coverage::discover_source_files(&original_dir, &inc_patterns, &exc_patterns);

                let mut v8_coverage: HashMap<String, HashMap<usize, u32>> = HashMap::new();
                for script in &all_scripts {
                    if script.url.is_empty() || script.url.starts_with("ekko:") { continue; }

                    let mut rel = script.url.clone();
                    if let Ok(stripped) = std::path::PathBuf::from(&script.url).strip_prefix(&original_dir) {
                        rel = stripped.to_string_lossy().replace('\\', "/");
                    }
                    
                    for sf in &source_files {
                        if sf.ends_with(&rel) || rel.ends_with(sf.rsplit('/').next().unwrap_or("")) {
                            rel = sf.clone();
                            break;
                        }
                    }

                    let source_path = original_dir.join(&rel);
                    if let Ok(src) = std::fs::read_to_string(&source_path) {
                        let offsets = coverage::line_offsets(&src);
                        let total_lines = offsets.len();
                        let entry = v8_coverage.entry(rel).or_insert_with(HashMap::new);
                        for func in &script.functions {
                            for range in &func.ranges {
                                let start_line = coverage::offset_to_line(&offsets, range.start_offset);
                                let end_line = coverage::offset_to_line(&offsets, range.end_offset).min(total_lines);
                                for line in start_line..=end_line {
                                    let e = entry.entry(line).or_insert(range.count);
                                    if range.count < *e { *e = range.count; }
                                }
                            }
                        }
                    }
                }

                let mut v8_functions: HashMap<String, Vec<coverage::FuncInfo>> = HashMap::new();
                let mut v8_stmts: HashMap<String, (u32, u32)> = HashMap::new();
                let mut v8_branches: HashMap<String, (u32, u32)> = HashMap::new();
                let mut v8_partial: HashMap<String, std::collections::HashSet<usize>> = HashMap::new();

                for script in &all_scripts {
                    if script.url.is_empty() || script.url.starts_with("ekko:") { continue; }
                    let mut rel = script.url.clone();
                    if let Ok(stripped) = std::path::PathBuf::from(&script.url).strip_prefix(&original_dir) {
                        rel = stripped.to_string_lossy().replace('\\', "/");
                    }
                    for sf in &source_files {
                        if sf.ends_with(&rel) || rel.ends_with(sf.rsplit('/').next().unwrap_or("")) {
                            rel = sf.clone(); break;
                        }
                    }

                    let funcs = v8_functions.entry(rel.clone()).or_default();
                    let stmts = v8_stmts.entry(rel.clone()).or_insert((0, 0));
                    let branches = v8_branches.entry(rel.clone()).or_insert((0, 0));
                    let partial = v8_partial.entry(rel.clone()).or_default();

                    for func in &script.functions {
                        
                        if !func.function_name.is_empty() && !func.ranges.is_empty() {
                            let source_path = original_dir.join(&rel);
                            let line = if let Ok(src) = std::fs::read_to_string(&source_path) {
                                let offsets = coverage::line_offsets(&src);
                                coverage::offset_to_line(&offsets, func.ranges[0].start_offset)
                            } else { 0 };
                            funcs.push(coverage::FuncInfo {
                                name: func.function_name.clone(),
                                line,
                                count: func.ranges[0].count,
                            });
                        }
                        
                        for range in &func.ranges {
                            stmts.0 += 1;
                            if range.count > 0 { stmts.1 += 1; }
                        }
                        
                        if func.ranges.len() > 1 {
                            let mut line_branch_hits: HashMap<usize, (u32, u32)> = HashMap::new();
                            for range in &func.ranges[1..] {
                                branches.0 += 1;
                                if range.count > 0 { branches.1 += 1; }
                                
                                let source_path = original_dir.join(&rel);
                                if let Ok(src) = std::fs::read_to_string(&source_path) {
                                    let offsets = coverage::line_offsets(&src);
                                    let line = coverage::offset_to_line(&offsets, range.start_offset);
                                    let entry = line_branch_hits.entry(line).or_insert((0, 0));
                                    entry.0 += 1; 
                                    if range.count > 0 { entry.1 += 1; } 
                                }
                            }
                            
                            for (line, (total, hit)) in &line_branch_hits {
                                if *hit > 0 && *hit < *total {
                                    partial.insert(*line);
                                }
                            }
                        }
                    }
                }

                let mut file_entries: Vec<coverage::CoverageFileEntry> = Vec::new();
                for rel_path in &source_files {
                    let abs_path = original_dir.join(rel_path);
                    let source = std::fs::read_to_string(&abs_path).unwrap_or_default();
                    let total_lines = source.lines().count() as u32;

                    let line_data = v8_coverage.get(rel_path).cloned().unwrap_or_default();
                    let hit_lines = line_data.values().filter(|&&c| c > 0).count() as u32;
                    let lines_total = if line_data.is_empty() { total_lines } else { line_data.len() as u32 };

                    let funcs = v8_functions.get(rel_path).cloned().unwrap_or_default();
                    let (st, sh) = v8_stmts.get(rel_path).copied().unwrap_or((0, 0));
                    let (bt, bh) = v8_branches.get(rel_path).copied().unwrap_or((0, 0));
                    let ft = funcs.len() as u32;
                    let fh = funcs.iter().filter(|f| f.count > 0).count() as u32;

                    file_entries.push(coverage::CoverageFileEntry {
                        name: rel_path.rsplit('/').next().unwrap_or(rel_path).to_string(),
                        rel_path: rel_path.clone(),
                        total_lines: lines_total,
                        hit_lines,
                        line_data,
                        source,
                        metrics: coverage::CoverageMetrics {
                            stmts_total: if st > 0 { st } else { lines_total },
                            stmts_hit: if st > 0 { sh } else { hit_lines },
                            branches_total: bt,
                            branches_hit: bh,
                            funcs_total: ft,
                            funcs_hit: fh,
                            lines_total,
                            lines_hit: hit_lines,
                        },
                        functions: funcs,
                        partial_lines: v8_partial.get(rel_path).cloned().unwrap_or_default(),
                    });
                }

                let cov_dir = original_dir.join("coverage");
                std::fs::create_dir_all(&cov_dir).ok();

                let mut lcov_scripts: Vec<coverage::ScriptCoverage> = Vec::new();
                let mut lcov_sources: HashMap<String, String> = HashMap::new();
                for fe in &file_entries {
                    lcov_sources.insert(fe.rel_path.clone(), fe.source.clone());
                    let ranges: Vec<coverage::CoverageRange> = fe.line_data.iter().map(|(&line, &count)| {
                        coverage::CoverageRange { start_offset: line, end_offset: line, count }
                    }).collect();
                    lcov_scripts.push(coverage::ScriptCoverage {
                        url: fe.rel_path.clone(),
                        functions: vec![coverage::FunctionCoverage { function_name: String::new(), ranges }],
                    });
                }
                
                let mut lcov = String::new();
                for fe in &file_entries {
                    lcov.push_str(&format!("SF:{}\n", fe.rel_path));
                    
                    for fi in &fe.functions {
                        lcov.push_str(&format!("FN:{},{}\n", fi.line, fi.name));
                        lcov.push_str(&format!("FNDA:{},{}\n", fi.count, fi.name));
                    }
                    lcov.push_str(&format!("FNF:{}\nFNH:{}\n", fe.metrics.funcs_total, fe.metrics.funcs_hit));
                    
                    lcov.push_str(&format!("BRF:{}\nBRH:{}\n", fe.metrics.branches_total, fe.metrics.branches_hit));
                    
                    let mut sorted: Vec<_> = fe.line_data.iter().collect();
                    sorted.sort_by_key(|(ln, _)| **ln);
                    for (ln, ct) in &sorted { lcov.push_str(&format!("DA:{},{}\n", ln, ct)); }
                    lcov.push_str(&format!("LF:{}\nLH:{}\n", fe.total_lines, fe.hit_lines));
                    lcov.push_str("end_of_record\n");
                }
                let lcov_path = cov_dir.join("lcov.info");
                std::fs::write(&lcov_path, &lcov).expect("Failed to write lcov.info");
                println!("Coverage: {}", lcov_path.display());

                let tree = coverage::build_tree(&file_entries, ".");
                let html_dir = cov_dir.join("html");
                let _ = std::fs::remove_dir_all(&html_dir);
                match coverage::generate_tree_report(&tree, &html_dir) {
                    Ok(()) => println!("HTML report: {}/index.html", html_dir.display()),
                    Err(msg) => eprintln!("{}", msg),
                }

                println!("\n{}/{} lines ({:.1}%) across {} files",
                    tree.hit_lines(), tree.total_lines(), tree.pct(), file_entries.len());
            }

            if any_failed {
                std::process::exit(1);
            }
            Ok(())
        }
        Commands::Build { member, all, client, server } => {
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let ws = ekko_core::packages::workspace::get_workspace()
                .ok_or_else(|| anyhow::anyhow!("no workspace found. Run from a workspace root or a project directory."))?;

            
            
            if client || (!server && !client) {
                let client_members: Vec<&ekko_core::packages::workspace::Member> = if all {
                    ws.members.values().filter(|m| m.kind != ekko_core::packages::workspace::MemberKind::Test).collect()
                } else if let Some(ref path) = member {
                    vec![find_member_by_path(ws, path)
                        .ok_or_else(|| anyhow::anyhow!("no member found at '{}'. Check the workspace map in ekko.json.", path.display()))?]
                } else {
                    match find_member_by_cwd(ws, &cwd) {
                        Some(m) => vec![m],
                        None => {
                            let names: Vec<String> = ws.members.values().map(|m| m.name.clone()).collect();
                            anyhow::bail!(
                                "`ekko build --client` must target a workspace member, but the current directory is the workspace root.\n  \
                                 cd into a member directory, or name it: ekko build --client <member-path>\n  \
                                 members: {}", names.join(", "));
                        }
                    }
                };
              for proj_member in client_members {
                
                let proj = ws.member_project_view(proj_member);
                let ws = &proj;
                println!("Building client bundle for {}...", proj_member.name);
                
                let pages_dir = ws.root.join("pages");
                let app_dir = ws.root.join("app");
                let entry_dir = if pages_dir.exists() { pages_dir } else if app_dir.exists() { app_dir } else { ws.root.join("src") };

                if entry_dir.exists() {
                    let out_dir = ws.root.join(".ekko").join("build").join("client");
                    let build_dir = ws.root.join(".ekko").join("build");
                    std::fs::create_dir_all(&out_dir)?;

                    let esbuild = ensure_esbuild_available()?;

                    let scss_out = build_dir.join("scss");
                    let _ = std::fs::create_dir_all(&scss_out);
                    let mut sass_compiled: Vec<(String, std::path::PathBuf)> = Vec::new();
                    for entry in walkdir::WalkDir::new(&ws.root).into_iter()
                        .filter_entry(|e| {
                            let name = e.file_name().to_string_lossy();
                            !name.starts_with('.') && name != "node_modules" && name != ".ekko"
                        })
                        .flatten()
                        .filter(|e| e.file_type().is_file())
                    {
                        let ext = entry.path().extension().and_then(|x| x.to_str()).unwrap_or("");
                        if ext != "scss" && ext != "sass" { continue; }
                        let rel = entry.path().strip_prefix(&ws.root).unwrap_or(entry.path());
                        let src_rel = rel.to_string_lossy().replace('\\', "/");
                        let out_name = src_rel.replace(".scss", ".css").replace(".sass", ".css");
                        let out_path = scss_out.join(&out_name);
                        if let Some(parent) = out_path.parent() { let _ = std::fs::create_dir_all(parent); }
                        match std::fs::read_to_string(entry.path()) {
                            Ok(scss_src) => {
                                let syntax = if ext == "sass" { ekko_core::parsers::css::SassSyntax::Sass } else { ekko_core::parsers::css::SassSyntax::Scss };
                                match ekko_core::parsers::css::compile_sass(&scss_src, syntax) {
                                    Ok(css) => {
                                        match ekko_core::parsers::css::transform_css(&css, true, Some("chrome90,firefox90,safari15")) {
                                            Ok(result) => {
                                                let _ = std::fs::write(&out_path, &result.code);
                                                sass_compiled.push((src_rel, out_path));
                                            }
                                            Err(e) => eprintln!("CSS transform error for {}: {}", src_rel, e),
                                        }
                                    }
                                    Err(e) => eprintln!("Sass compile error for {}: {}", src_rel, e),
                                }
                            }
                            Err(e) => eprintln!("Read error for {}: {}", src_rel, e),
                        }
                    }
                    if !sass_compiled.is_empty() {
                        println!("Compiled {} Sass file(s) (grass + lightningcss)", sass_compiled.len());
                    }

                    let entries: Vec<String> = walkdir::WalkDir::new(&entry_dir)
                        .into_iter()
                        .filter_entry(|e| !e.file_name().to_string_lossy().starts_with('.'))
                        .flatten()
                        .filter(|e| e.file_type().is_file())
                        .filter(|e| {
                            let ext = e.path().extension().and_then(|x| x.to_str()).unwrap_or("");
                            (ext == "tsx" || ext == "jsx" || ext == "ts" || ext == "js")
                                && !e.path().to_string_lossy().contains(".test.")
                                && !e.path().to_string_lossy().contains("route.")
                        })
                        .map(|e| e.path().to_string_lossy().to_string())
                        .collect();

                    if entries.is_empty() {
                        println!("No client entry points found in {}/", entry_dir.display());
                    } else {

                        let mut ssr_originals: Vec<(String, String)> = Vec::new();
                        for entry in &entries {
                            let content = std::fs::read_to_string(entry).unwrap_or_default();
                            if content.contains("/* START SSR */") {
                                let stripped = strip_ssr_blocks(&content);
                                if stripped.contains("export function ssr") || stripped.contains("export const ssr") {
                                    let rel = entry.replace('\\', "/");
                                    let entry_dir_str = entry_dir.to_string_lossy().replace('\\', "/");
                                    let rel_name = rel.strip_prefix(&format!("{}/", entry_dir_str)).unwrap_or(&rel);
                                    eprintln!("  [WARN] {} has ssr() export but code outside /* START SSR */ markers", rel_name);
                                }
                                ssr_originals.push((entry.clone(), content));
                                std::fs::write(entry, &stripped)?;
                            }
                        }

                        
                        let mut css_originals = rewrite_css_imports_in_tree(&ws.root);

                        css_originals.extend(rewrite_css_module_imports_in_tree(&ws));

                        let hydrate_file = ws.root.join("_hydrate.js");
                        let hydrate_src = get_hydrate_js("");
                        std::fs::write(&hydrate_file, hydrate_src)?;

                        println!("Building client bundles ({} entries + hydrate)...", entries.len());
                        let mut cmd = std::process::Command::new(&esbuild);

                        cmd.arg(hydrate_file.to_string_lossy().as_ref());
                        for entry in &entries {
                            cmd.arg(entry);
                        }

                        
                        
                        let store = ekko_core::packages::store::store_root();
                        let mut spec_files: std::collections::HashMap<String, String> = std::collections::HashMap::new();
                        for (name, dep) in &ws.dependencies {
                            let dep_dir = store.join(name).join(&dep.version);
                            for (subpath, file) in &dep.exports {
                                let spec = if subpath == "." { name.clone() }
                                    else { format!("{}/{}", name, subpath.trim_start_matches("./")) };
                                let file_path = dep_dir.join(file).display().to_string();
                                cmd.arg(format!("--alias:{}={}", spec, file_path));
                                spec_files.insert(spec, file_path);
                            }
                        }

                        
                        for (from, to) in &ws.import_overrides {
                            let mut target = to.clone();
                            let mut seen = std::collections::HashSet::new();
                            while let Some(next) = ws.import_overrides.get(&target) {
                                if !seen.insert(target.clone()) { break; }
                                target = next.clone();
                            }
                            if let Some(file_path) = spec_files.get(&target) {
                                cmd.arg(format!("--alias:{}={}", from, file_path));
                            }
                        }

                        let mimir_client_file = ws.root.join("__mimir.js");
                        std::fs::write(&mimir_client_file, get_mimir_client_js())?;
                        cmd.arg(format!("--alias:ekko:rune/mimir={}", mimir_client_file.display()));

                        let router_client_file = ws.root.join("__router.js");
                        std::fs::write(&router_client_file, get_router_client_js())?;
                        cmd.arg(format!("--alias:ekko:rune/router={}", router_client_file.display()));

                        
                        let jsx_client_file = ws.root.join("__jsx.js");
                        std::fs::write(&jsx_client_file, get_jsx_client_js())?;

                        
                        cmd.arg(format!("--alias:ekko:jsx-runtime={}", jsx_client_file.display()));
                        cmd.arg(format!("--alias:ekko/jsx-runtime={}", jsx_client_file.display()));

                        let metafile_path = build_dir.join("meta.json");
                        cmd.args([
                            "--bundle", "--format=esm", "--platform=browser",
                            "--splitting", "--chunk-names=chunks/[name]-[hash]",
                            "--entry-names=[dir]/[name]-[hash]",
                            &format!("--outdir={}", out_dir.display()),
                            &format!("--metafile={}", metafile_path.display()),
                            "--external:ekko:*",
                            "--define:process.env.NODE_ENV=\"production\"",
                            "--jsx=automatic",
                            "--jsx-import-source=ekko",   
                            "--target=es2022,chrome90,firefox90,safari15",
                            "--minify",
                        ]);

                        for (src_rel, compiled_path) in &sass_compiled {
                            let css_rel = src_rel.replace(".scss", ".css").replace(".sass", ".css");
                            let _ = std::fs::copy(&compiled_path, ws.root.join(&css_rel));
                        }

                        let output = cmd.output()?;

                        let _ = std::fs::remove_file(&hydrate_file);
                        let _ = std::fs::remove_file(&mimir_client_file);
                        let _ = std::fs::remove_file(&router_client_file);

                        restore_files(&css_originals);
                        for (path, original) in &ssr_originals {
                            let _ = std::fs::write(path, original);
                        }

                        if !output.status.success() {
                            eprintln!("{}", String::from_utf8_lossy(&output.stderr));
                            std::process::exit(1);
                        }
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        if !stderr.is_empty() { eprintln!("{}", stderr); }

                        let mut manifest = serde_json::json!({ "hydrate": null, "pages": {}, "chunks": [], "styles": [] });
                        if metafile_path.exists() {
                            let meta_str = std::fs::read_to_string(&metafile_path)?;
                            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                                if let Some(outputs) = meta["outputs"].as_object() {
                                    let out_abs = out_dir.to_string_lossy().replace('\\', "/");
                                    let out_rel = ".ekko/build/client";

                                    let strip_prefix = |p: &str| -> String {
                                        let norm = p.replace('\\', "/");
                                        norm.strip_prefix(&format!("{}/", out_abs))
                                            .or_else(|| norm.strip_prefix(&format!("{}/", out_rel)))
                                            .unwrap_or(&norm)
                                            .to_string()
                                    };

                                    let mut chunk_set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
                                    let mut style_set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();

                                    for (output_path, info) in outputs {
                                        let rel = strip_prefix(output_path);
                                        let is_css = rel.ends_with(".css");

                                        if is_css {
                                            style_set.insert(rel.clone());
                                            continue;
                                        }

                                        if let Some(entry_point) = info["entryPoint"].as_str() {
                                            let imports: Vec<String> = info["imports"].as_array()
                                                .map(|arr| arr.iter()
                                                    .filter_map(|imp| imp["path"].as_str())
                                                    .map(|p| strip_prefix(p))
                                                    .collect())
                                                .unwrap_or_default();

                                            let css_imports: Vec<String> = imports.iter()
                                                .filter(|p| p.ends_with(".css"))
                                                .cloned().collect();
                                            let js_imports: Vec<String> = imports.iter()
                                                .filter(|p| !p.ends_with(".css"))
                                                .cloned().collect();

                                            for imp in &js_imports {
                                                chunk_set.insert(imp.clone());
                                            }

                                            if entry_point.contains("_hydrate") {
                                                manifest["hydrate"] = serde_json::json!(rel);
                                            } else {
                                                let entry_norm = entry_point.replace('\\', "/");
                                                let entry_dir_str = entry_dir.to_string_lossy().replace('\\', "/");
                                                let entry_dir_name = entry_dir.file_name()
                                                    .map(|n| n.to_string_lossy().to_string())
                                                    .unwrap_or_default();
                                                let page_key = entry_norm
                                                    .strip_prefix(&format!("{}/", entry_dir_str))
                                                    .or_else(|| entry_norm.strip_prefix(&format!("{}/", entry_dir_name)))
                                                    .unwrap_or(&entry_norm);
                                                manifest["pages"][page_key] = serde_json::json!({
                                                    "file": rel,
                                                    "imports": js_imports,
                                                    "css": css_imports,
                                                });
                                            }
                                        } else {
                                            chunk_set.insert(rel);
                                        }
                                    }

                                    manifest["chunks"] = serde_json::json!(chunk_set.into_iter().collect::<Vec<_>>());
                                    manifest["styles"] = serde_json::json!(style_set.into_iter().collect::<Vec<_>>());
                                }
                            }
                            let _ = std::fs::remove_file(&metafile_path);
                        }

                        let mut route_entries: Vec<serde_json::Value> = Vec::new();
                        if let Some(pages) = manifest["pages"].as_object() {
                            for page_key in pages.keys() {
                                if is_convention_file(page_key) { continue; }
                                if page_key.contains(".test.") { continue; }
                                let pattern = page_key_to_route(page_key);
                                let is_catch_all = pattern.contains('*');
                                let is_dynamic = pattern.contains(':');
                                let priority = if is_catch_all { 2 } else if is_dynamic { 1 } else { 0 };
                                route_entries.push(serde_json::json!({
                                    "pattern": pattern,
                                    "page": page_key,
                                    "priority": priority,
                                }));
                            }
                            route_entries.sort_by(|a, b| {
                                let pa = a["priority"].as_i64().unwrap_or(0);
                                let pb = b["priority"].as_i64().unwrap_or(0);
                                pa.cmp(&pb).then_with(|| {
                                    a["pattern"].as_str().unwrap_or("").cmp(b["pattern"].as_str().unwrap_or(""))
                                })
                            });
                        }
                        manifest["routes"] = serde_json::json!(route_entries);

                        let manifest_path = build_dir.join("manifest.json");
                        std::fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?)?;

                        let count = walkdir::WalkDir::new(&out_dir).into_iter().flatten()
                            .filter(|e| e.file_type().is_file()).count();
                        println!("  → {} chunks to {}/", count, out_dir.display());
                        println!("  → manifest: {}", manifest_path.display());
                    }
                }
              }
            }

            if server || (!server && !client) {
                let members_to_build: Vec<&ekko_core::packages::workspace::Member> = if all {
                    ws.members.values()
                        .filter(|m| m.kind != ekko_core::packages::workspace::MemberKind::Test)
                        .collect()
                } else if let Some(ref path) = member {
                    let m = find_member_by_path(ws, path)
                        .ok_or_else(|| anyhow::anyhow!("no member found at '{}'. Check workspace map in ekko.json.", path.display()))?;
                    vec![m]
                } else {
                    let m = find_member_by_cwd(ws, &cwd)
                        .ok_or_else(|| anyhow::anyhow!("current directory is not a workspace member. Specify a member path: ekko build <path>"))?;
                    vec![m]
                };

                for m in members_to_build {
                    println!("Building {}...", m.name);
                    let result = ekko_core::packages::build::build_member(m)?;
                    let out_dir = m.root_dir.join("build");
                    std::fs::create_dir_all(&out_dir)?;
                    for entry in &result.files {
                        let path = out_dir.join(&entry.relative_path);
                        if let Some(parent) = path.parent() {
                            std::fs::create_dir_all(parent)?;
                        }
                        std::fs::write(&path, &entry.content)?;
                    }
                    println!("  → {} files to {}/", result.files.len(), out_dir.display());
                }
            }
            Ok(())
        }
        Commands::Add { package, build, store, ekl, ekl_path, ekl_deps, ekl_arch, ekl_platform } => {

            
            if ekl {
                let g = if std::env::var_os("NO_COLOR").is_none() { "\x1b[38;2;61;214;168m" } else { "" };
                let dim = if std::env::var_os("NO_COLOR").is_none() { "\x1b[2m" } else { "" };
                let r = if std::env::var_os("NO_COLOR").is_none() { "\x1b[0m" } else { "" };
                let package = package.clone().ok_or_else(|| anyhow::anyhow!("`ekko add --ekl` requires a package name"))?;
                let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
                let (root_name, root_ver) = parse_pkg_spec(&package);
                let out_dir = ekl_path.clone().unwrap_or_else(|| ".".to_string());
                let norm_plat = |p: &str| -> String { match p.to_lowercase().as_str() {
                    "apple" | "macos" | "mac" | "osx" | "darwin" => "macos".into(),
                    "windows" | "win" => "windows".into(),
                    "linux" => "linux".into(), o => o.into() } };
                let norm_arch = |a: &str| -> String { match a.to_lowercase().as_str() {
                    "x64" | "x86_64" | "amd64" => "x64".into(),
                    "arm64" | "aarch64" => "arm64".into(), o => o.into() } };
                let plat_filter: Vec<String> = ekl_platform.iter().map(|p| norm_plat(p)).collect();
                let arch_filter: Vec<String> = ekl_arch.iter().map(|a| norm_arch(a)).collect();
                let b = if std::env::var_os("NO_COLOR").is_none() { "\x1b[1m" } else { "" };
                println!("\n  {g}{b}ekko add{r}  {dim}\u{2192} --ekl {}{r}", out_dir);
                let mut queue: Vec<(String, Option<String>)> = vec![(root_name, root_ver)];
                let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
                struct EklRow { fname: String, kb: f64, is_dep: bool }
                let mut rows: Vec<EklRow> = Vec::new();
                while let Some((n, v)) = queue.pop() {
                    if !seen.insert(n.clone()) { continue; }
                    let is_dep = seen.len() > 1;
                    
                    let sp = Spinner::start(&format!("{}resolving {}", if is_dep { "dep: " } else { "" }, n));

                    let detail = match client.package_detail_value(&n) { Ok(d) => d, Err(e) => { sp.finish(); return Err(e); } };
                    let versions = detail.get("versions").and_then(|x| x.as_array());
                    let version = match v {
                        Some(ver) => ver,
                        None => versions.and_then(|a| a.first())
                            .and_then(|e| e.get("version")).and_then(|x| x.as_str()).unwrap_or("").to_string(),
                    };
                    
                    if !version.is_empty() {
                        if let Some(entry) = versions.and_then(|a| a.iter().find(|e| e.get("version").and_then(|x| x.as_str()) == Some(version.as_str()))) {
                            let minq = entry.get("min_ekko_version").and_then(|x| x.as_str()).unwrap_or("");
                            let maxq = entry.get("max_ekko_version").and_then(|x| x.as_str()).unwrap_or("");
                            if let Err(e) = ekko_core::packages::store::enforce_ekko_range(&n, &version, minq, maxq) {
                                sp.finish();
                                return Err(e);
                            }
                        }
                    }
                    let combos: Vec<(String, String)> = detail.get("platforms").and_then(|x| x.as_array())
                        .map(|arr| arr.iter()
                            .filter(|p| p.get("version").and_then(|x| x.as_str()) == Some(version.as_str()))
                            .filter_map(|p| {
                                let plat = p.get("platform").and_then(|x| x.as_str())?.to_string();
                                let arch = p.get("arch").and_then(|x| x.as_str())?.to_string();
                                if (plat_filter.is_empty() || plat_filter.iter().any(|f| *f == plat)) &&
                                   (arch_filter.is_empty() || arch_filter.iter().any(|f| *f == arch)) {
                                    Some((plat, arch))
                                } else { None }
                            }).collect())
                        .unwrap_or_default();
                    let flat = n.replace('/', "-").replace('@', "");
                    let mut pkg_errs: Vec<String> = Vec::new();
                    for (plat, arch) in &combos {
                        let fname = format!("{}-{}.{}.{}.ekl", flat, version, plat, arch);
                        let out_file = std::path::Path::new(&out_dir).join(&fname);
                        match client.download_ekl_exact(&n, &version, plat, arch, &out_file) {
                            Ok(sz) => rows.push(EklRow { fname, kb: sz as f64 / 1024.0, is_dep }),
                            Err(e) => pkg_errs.push(format!("{} failed: {}", fname, e)),
                        }
                    }
                    sp.finish();
                    if version.is_empty() { println!("  {dim}! no versions published for {}{r}", n); }
                    else if combos.is_empty() { println!("  {dim}! no matching combos for {}@{}{r}", n, version); }
                    for e in &pkg_errs { println!("  {dim}! {}{r}", e); }
                    if ekl_deps && !version.is_empty() {
                        if let Some(entry) = versions.and_then(|a| a.iter().find(|e| e.get("version").and_then(|x| x.as_str()) == Some(version.as_str()))) {
                            if let Some(ship) = entry.get("ship").and_then(|x| x.as_object()) {
                                for (dn, dv) in ship {
                                    if !seen.contains(dn) {
                                        let spec = dv.as_str().filter(|s| !s.is_empty() && s.as_bytes()[0].is_ascii_digit()).map(String::from);
                                        queue.push((dn.clone(), spec));
                                    }
                                }
                            }
                        }
                    }
                }
                
                let name_w = rows.iter().map(|r| r.fname.chars().count()).max().unwrap_or(0);
                println!();
                for row in &rows {
                    let pad = " ".repeat(name_w.saturating_sub(row.fname.chars().count()));
                    let tag = if row.is_dep { format!("{dim}dep{r}") } else { format!("{g}pkg{r}") };
                    println!("  {g}\u{2713}{r} {} {b}{}{r}{}  {dim}{:.1} KB{r}", tag, row.fname, pad, row.kb);
                }
                println!("\n  {g}\u{2713} done{r} {dim}: {} .ekl file(s) in {}{r}\n", rows.len(), out_dir);
                return Ok(());
            }

            if store {
                let package = package.clone().ok_or_else(|| anyhow::anyhow!("`ekko add -s` requires a package name"))?;
                use std::io::Write;
                let g = if std::env::var_os("NO_COLOR").is_none() { "\x1b[38;2;61;214;168m" } else { "" };
                let dim = if std::env::var_os("NO_COLOR").is_none() { "\x1b[2m" } else { "" };
                let b = if std::env::var_os("NO_COLOR").is_none() { "\x1b[1m" } else { "" };
                let r = if std::env::var_os("NO_COLOR").is_none() { "\x1b[0m" } else { "" };
                let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
                println!("\n  {g}{b}ekko add{r}  {dim}\u{2192} store{r}");
                { let sp = Spinner::start(&format!("Connecting to {}", client.registry_url())); std::thread::sleep(std::time::Duration::from_millis(250)); sp.finish(); }
                println!("  {g}\u{2713}{r} {dim}connected: {}{r}", client.registry_url());
                let mut queue: Vec<(String, Option<String>)> = Vec::new();
                let (root_name, root_ver) = parse_pkg_spec(&package);
                queue.push((root_name, root_ver));
                let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
                struct AddRow { name: String, version: String, size_kb: f64, cached: bool, is_dep: bool }
                let mut rows: Vec<AddRow> = Vec::new();
                while let Some((n, v)) = queue.pop() {
                    if !seen.insert(n.clone()) { continue; }
                    let is_dep = !rows.is_empty();

                    
                    
                    if let Some(store_path) = v.as_deref().and_then(|spec| ekko_core::packages::store::cached_exact(&n, spec)) {
                        
                        ekko_core::packages::store::gate_cached(&client, &n, v.as_deref().unwrap_or_default(), &store_path)?;
                        rows.push(AddRow { name: n.clone(), version: v.clone().unwrap_or_default(), size_kb: 0.0, cached: true, is_dep });
                        for (dn, dv) in ekko_core::packages::store::ship_deps_versioned(&store_path) {
                            if !seen.contains(&dn) { queue.push((dn, dv)); }
                        }
                        continue;
                    }
                    let label = if is_dep { format!("dep: {}", n) } else { n.clone() };
                    let sp = Spinner::start(&format!("resolving {}", label));
                    let res = ekko_core::packages::store::fetch_extract(&client, &n, v.as_deref());
                    sp.finish();
                    let (result, _exports) = res?;
                    rows.push(AddRow { name: result.name.clone(), version: result.version.clone(), size_kb: (result.size as f64) / 1024.0, cached: false, is_dep });
                    for (dn, dv) in ekko_core::packages::store::ship_deps_versioned(&result.store_path) {
                        if !seen.contains(&dn) { queue.push((dn, dv)); }
                    }
                    let _ = std::io::stdout().flush();
                }
                
                let name_w = rows.iter().map(|r| r.name.chars().count()).max().unwrap_or(0);
                let ver_w = rows.iter().map(|r| r.version.chars().count() + 1).max().unwrap_or(0); 
                println!();
                for row in &rows {
                    let np = " ".repeat(name_w.saturating_sub(row.name.chars().count()));
                    let vstr = format!("@{}", row.version);
                    let vp = " ".repeat(ver_w.saturating_sub(vstr.chars().count()));
                    let src = if row.cached { format!("{dim}cached{r}") } else { format!("{dim}{:.1} KB{r}", row.size_kb) };
                    let tag = if row.is_dep { format!("{dim}dep{r}") } else { format!("{g}pkg{r}") };
                    println!("  {g}\u{2713}{r} {tag} {b}{}{r}{np} {dim}{}{r}{vp}  {}", row.name, vstr, src);
                }
                let cached_n = rows.iter().filter(|r| r.cached).count();
                println!("\n  {g}\u{2713} done{r} {dim}: {} package(s) ({} cached) in {}{r}\n", rows.len(), cached_n, ekko_core::packages::store::store_root().display());
                return Ok(());
            }
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let ws = ekko_core::packages::workspace::get_workspace()
                .ok_or_else(|| anyhow::anyhow!("no workspace found"))?;
            let category = if build { ekko_core::packages::workspace::DepCategory::Build } else { ekko_core::packages::workspace::DepCategory::Ship };

            
            
            if package.is_none() {
                let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
                let members: Vec<&ekko_core::packages::workspace::Member> = match find_member_by_cwd(ws, &cwd) {
                    Some(m) => vec![m],
                    None => ws.members.values()
                        .filter(|m| m.kind != ekko_core::packages::workspace::MemberKind::Test)
                        .collect(),
                };
                let mut total = 0usize;
                for m in members {
                    println!("Installing dependencies for {}...", m.name);
                    let results = ekko_core::packages::store::install_member_deps(&client, m, Some(&**ws))?;
                    if results.is_empty() {
                        println!("  (no declared dependencies)");
                    } else {
                        for r in &results { println!("  + {}@{} ({} bytes)", r.name, r.version, r.size); }
                        total += results.len();
                    }
                }
                println!("\nInstalled {} dependency package(s) into {}", total, ekko_core::packages::store::store_root().display());
                return Ok(());
            }
            let package = package.unwrap();

            
            
            let target_root = match find_member_by_cwd(ws, &cwd) {
                Some(m) => m.root_dir.clone(),
                None => {
                    let names: Vec<String> = ws.members.values().map(|m| m.name.clone()).collect();
                    anyhow::bail!(
                        "`ekko add {pkg}` adds a dependency to a workspace member, but the current directory is the workspace root.\n  \
                         cd into the member that needs it: cd <member> && ekko add {pkg}\n  \
                         members: {members}", pkg = package, members = names.join(", "));
                }
            };

            if package.ends_with(".ekl") && std::path::Path::new(&package).exists() {
                let result = ekko_core::packages::store::install_local(std::path::Path::new(&package), category, &target_root)?;
                println!("+ {}@{} (local, {} bytes)", result.name, result.version, result.size);
            } else {
                let (name, version) = parse_pkg_spec(&package);
                let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
                let results = ekko_core::packages::store::install_with_deps(&client, &name, version.as_deref(), category, &target_root)?;
                for r in &results {
                    println!("+ {}@{} ({} bytes)", r.name, r.version, r.size);
                }
                if results.len() > 1 {
                    println!("  {} packages installed", results.len());
                }
            }
            Ok(())
        }
        Commands::Remove { package, store } => {
            
            if store {
                let g = if std::env::var_os("NO_COLOR").is_none() { "\x1b[38;2;61;214;168m" } else { "" };
                let dim = if std::env::var_os("NO_COLOR").is_none() { "\x1b[2m" } else { "" };
                let b = if std::env::var_os("NO_COLOR").is_none() { "\x1b[1m" } else { "" };
                let y = if std::env::var_os("NO_COLOR").is_none() { "\x1b[33m" } else { "" };
                let r = if std::env::var_os("NO_COLOR").is_none() { "\x1b[0m" } else { "" };
                println!("\n  {g}{b}ekko remove{r}  {dim}\u{2192} store{r}");
                let sp = Spinner::start(&format!("removing {}", package));
                let removed = ekko_core::packages::store::remove_from_store(&package);
                sp.finish();
                let removed = removed?;
                if removed.is_empty() {
                    println!("  {y}!{r} {dim}{} not found in {}{r}\n", package, ekko_core::packages::store::store_root().display());
                } else {
                    for v in &removed { println!("  {g}\u{2713}{r} removed {b}{}{r}{dim}@{}{r}", package, v); }
                    println!("\n  {g}\u{2713} done{r} {dim}: {} version(s) removed from store{r}\n", removed.len());
                }
                return Ok(());
            }
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let ws = ekko_core::packages::workspace::get_workspace()
                .ok_or_else(|| anyhow::anyhow!("no workspace found"))?;
            ekko_core::packages::store::remove_package(&package, &ws.root)?;
            println!("- {}", package);
            Ok(())
        }
        Commands::Publish { dry_run, tag: _, allow_private_on_public } => {
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
            let result = ekko_core::packages::store::publish_package(&client, None, dry_run, &cwd, allow_private_on_public)?;
            if dry_run {
                println!("Dry run, would publish:");
                println!("  name:     {}", result.name);
                println!("  version:  {}", result.version);
                println!("  platform: {}-{}", result.platform, result.arch);
                println!("  size:     {} bytes", result.size);
                println!("  hash:     {}", result.integrity);
            } else if result.published {
                println!("Published {}@{} ({}-{})", result.name, result.version, result.platform, result.arch);
            } else {
                println!("Nothing published for {}@{} — all builds were skipped.", result.name, result.version);
            }
            if !result.skipped.is_empty() {
                println!("Skipped {} build(s): {}", result.skipped.len(), result.skipped.join(", "));
                if !allow_private_on_public {
                    println!("Re-run with --allow-private-on-public to publish them from your private storage (they stay publicly downloadable).");
                }
            }
            Ok(())
        }
        Commands::Search { query, limit } => {
            let client = ekko_core::packages::registry::RegistryClient::from_user_config()?;
            let results = client.search(&query, limit)?;
            if results.is_empty() {
                println!("No packages found for '{}'", query);
            } else {

                let color = banner::stdout_color();
                let (c_name, c_ver, c_desc, r) = if color {
                    ("\x1b[1;36m", "\x1b[2m", "\x1b[38;2;120;170;130m", "\x1b[0m")
                } else { ("", "", "", "") };
                let name_w = results.iter().map(|x| x.name.chars().count()).max().unwrap_or(0);
                for res in &results {
                    let pad = " ".repeat(name_w.saturating_sub(res.name.chars().count()) + 2);
                    let mut line = format!("  {c_name}{}{r}{pad}{c_ver}v{}{r}", res.name, res.latest_version);
                    if !res.description.trim().is_empty() {
                        line.push_str(&format!("  {c_desc}{}{r}", res.description.trim()));
                    }
                    println!("{line}");
                }
                println!("\n{c_ver}{} package(s).{r}", results.len());
            }
            Ok(())
        }
        Commands::List => {
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let ws = ekko_core::packages::workspace::get_workspace()
                .ok_or_else(|| anyhow::anyhow!("no workspace found"))?;
            if let Some(lock) = &ws.lockfile {
                if lock.packages.is_empty() {
                    println!("No packages installed.");
                } else {
                    println!("{:<30} {:<12} {}", "Package", "Version", "Category");
                    for (name, pkg) in &lock.packages {
                        let cat = match pkg.category {
                            ekko_core::packages::workspace::DepCategory::Ship => "ship",
                            ekko_core::packages::workspace::DepCategory::Build => "build",
                        };
                        println!("{:<30} {:<12} {}", name, pkg.version, cat);
                    }
                    println!("\n{} package(s) installed.", lock.packages.len());
                }
            } else {
                println!("No lockfile found.");
            }
            Ok(())
        }
        Commands::Check { files } => {
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));

            let targets: Vec<PathBuf> = if files.is_empty() {
                discover_ts_files(&cwd)
            } else {
                files.iter().map(|f| cwd.join(f)).collect()
            };

            if targets.is_empty() {
                println!("No TypeScript files found.");
                return Ok(());
            }

            let mut total_errors = 0u32;
            let mut checked = 0u32;

            for path in &targets {
                let source = match std::fs::read_to_string(path) {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("{}: error reading file: {}", path.display(), e);
                        total_errors += 1;
                        continue;
                    }
                };

                let filename = path.to_string_lossy().to_string();
                let diagnostics = ekko_core::tooling::check::check_file(&source, &filename);
                checked += 1;

                for diag in &diagnostics {
                    total_errors += 1;
                    let rel = path.strip_prefix(&cwd).unwrap_or(path);
                    eprintln!("{}:{}:{} - error: {}", rel.display(), diag.line, diag.col, diag.message);
                }
            }

            if total_errors == 0 {
                println!("check: {} file(s) checked, no errors found.", checked);
                Ok(())
            } else {
                eprintln!("\ncheck: {} error(s) in {} file(s).", total_errors, checked);
                std::process::exit(1);
            }
        }
        Commands::Pack { member, all } => {
            let cwd = std::env::current_dir().unwrap_or_default();
            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));

            let pack_and_write = |m: &ekko_core::packages::workspace::Member, dist_root: &std::path::Path| -> anyhow::Result<()> {
                let (os, arch) = ekko_core::packages::build::current_platform();
                let has_native = !m.native.is_empty();
                let (plat, ar) = if has_native { (os, arch) } else { ("any", "any") };

                println!("Packing {} v{}...", m.name, m.version);
                let ekl_data = ekko_core::packages::build::pack_member(m, plat, ar)?;

                let dist_dir = dist_root.join("dist");
                std::fs::create_dir_all(&dist_dir)?;
                let filename = format!("{}.{}.{}.ekl", m.name.replace('/', "-").replace('@', ""), plat, ar);
                let out_path = dist_dir.join(&filename);
                std::fs::write(&out_path, &ekl_data)?;
                println!("  → {} ({} bytes)", out_path.display(), ekl_data.len());
                Ok(())
            };

            if let Some(ws) = ekko_core::packages::workspace::get_workspace() {
                let members_to_pack: Vec<&ekko_core::packages::workspace::Member> = if all {
                    ws.members.values()
                        .filter(|m| m.kind != ekko_core::packages::workspace::MemberKind::Test)
                        .collect()
                } else if let Some(ref path) = member {
                    let m = find_member_by_path(ws, path)
                        .ok_or_else(|| anyhow::anyhow!("no member found at '{}'. Check workspace map in ekko.json.", path.display()))?;
                    vec![m]
                } else {
                    let m = find_member_by_cwd(ws, &cwd)
                        .ok_or_else(|| anyhow::anyhow!("current directory is not a workspace member. Specify a member path: ekko pack <path>"))?;
                    vec![m]
                };
                for m in members_to_pack {
                    pack_and_write(m, &ws.root)?;
                }
            } else {
                let config_path = cwd.join("ekko.json");
                if !config_path.exists() {
                    anyhow::bail!("no workspace or ekko.json found. Run from a project directory.");
                }
                let standalone = ekko_core::packages::workspace::parse_standalone_member(&config_path)?;
                pack_and_write(&standalone, &cwd)?;
            }
            Ok(())
        }
        Commands::Dev { file, port, allow } => {
            ekko_core::engine::v8_runtime::set_permissions(ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());
            let cwd = std::env::current_dir().unwrap_or_default();
            let server_file = cwd.join(&file);
            if !server_file.exists() {
                anyhow::bail!("server file not found: {}", server_file.display());
            }

            ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
            let root_ws = ekko_core::packages::workspace::get_workspace()
                .ok_or_else(|| anyhow::anyhow!("no workspace found (ekko.json). Run from a project root."))?;

            
            let dev_member = match find_member_by_cwd(root_ws, &cwd) {
                Some(m) => m,
                None => {
                    let names: Vec<String> = root_ws.members.values().map(|m| m.name.clone()).collect();
                    anyhow::bail!(
                        "`ekko dev` must run inside a workspace member, but the current directory is the workspace root.\n  \
                         cd into the member you want to run: cd <member> && ekko dev\n  \
                         members: {}", names.join(", "));
                }
            };
            let proj = root_ws.member_project_view(dev_member);
            let ws = &proj;

            

            let enforcing = !allow.is_empty();
            let allow_flags: Vec<String> = if enforcing { allow.clone() } else { vec!["all".to_string()] };

            println!("\x1b[1;35m=== ekko dev ===\x1b[0m \x1b[2m{}\x1b[0m", dev_member.name);
            if enforcing {
                println!("\x1b[2menforcing (dev): {}\x1b[0m", allow.join(", "));
            } else {
                println!("\x1b[2mfull trust (allow=all)\x1b[0m");
            }

            println!("\x1b[36mBuilding client bundles...\x1b[0m");
            if let Err(e) = build_client(&ws) {
                eprintln!("\x1b[31mClient build failed: {}\x1b[0m", e);
            } else {
                println!("\x1b[32mClient build OK\x1b[0m");
            }

            let (tx, rx) = std::sync::mpsc::channel::<notify::Result<notify::Event>>();
            let mut watcher = notify::recommended_watcher(tx)?;

            
            
            notify::Watcher::watch(&mut watcher, &ws.root, notify::RecursiveMode::Recursive)?;

            println!("\x1b[36mWatching {:?} for changes...\x1b[0m", ws.root);

            let port_env = port.map(|p| format!("{}", p));
            let mut server_process = start_dev_server(&server_file, port_env.as_deref(), &allow_flags)?;
            println!("\x1b[32mServer started (PID {})\x1b[0m", server_process.id());

            let mut last_rebuild = std::time::Instant::now();

            
            
            let mut self_written: std::collections::HashSet<String> = std::collections::HashSet::new();
            let mut self_written_at = std::time::Instant::now();
            loop {
                match rx.recv_timeout(std::time::Duration::from_millis(100)) {
                    Ok(Ok(event)) => {

                        
                        
                        if matches!(event.kind, notify::EventKind::Access(_)) {
                            continue;
                        }
                        if last_rebuild.elapsed() < std::time::Duration::from_millis(200) {
                            continue;
                        }
                        
                        if self_written_at.elapsed() > std::time::Duration::from_secs(3) { self_written.clear(); }
                        let paths: Vec<String> = event.paths.iter()
                            .map(|p| p.to_string_lossy().to_string())
                            
                            .filter(|p| { let n = p.replace('\\', "/"); !(n.contains("/.ekko/") || n.contains("/node_modules/") || n.contains("/.git/") || n.contains("/dist/")) })

                            
                            .filter(|p| { let n = p.replace('\\', "/"); !self_written.iter().any(|s| n.ends_with(s.as_str())) })
                            .collect();
                        let is_relevant = paths.iter().any(|p| {
                            p.ends_with(".tsx") || p.ends_with(".ts") || p.ends_with(".jsx") || p.ends_with(".js")
                            || p.ends_with(".css") || p.ends_with(".scss") || p.ends_with(".sass") || p.ends_with(".json")
                        });
                        if !is_relevant { continue; }

                        let changed = paths.iter()
                            .filter_map(|p| std::path::Path::new(p).file_name())
                            .map(|f| f.to_string_lossy().to_string())
                            .collect::<Vec<_>>()
                            .join(", ");
                        println!("\n\x1b[33m[changed] {}\x1b[0m", changed);

                        let is_server_change = paths.iter().any(|p| {
                            let norm = p.replace('\\', "/");
                            norm.ends_with("/server.tsx") || norm.ends_with("/server.ts") || norm.ends_with("shared.tsx")
                        });

                        

                        
                        let is_client_change = paths.iter().any(|p| {
                            let norm = p.replace('\\', "/");
                            let is_server = norm.ends_with("/server.tsx") || norm.ends_with("/server.ts") || norm.ends_with("shared.tsx");
                            !is_server && (norm.ends_with(".tsx") || norm.ends_with(".ts") || norm.ends_with(".jsx") || norm.ends_with(".js")
                                || norm.ends_with(".scss") || norm.ends_with(".sass") || norm.ends_with(".css"))
                        });

                        if is_client_change {
                            let start = std::time::Instant::now();
                            print!("\x1b[36mRebuilding client... \x1b[0m");
                            match build_client(&ws) {
                                Ok(touched) => {

                                    
                                    self_written = touched.iter().filter_map(|p| {
                                        p.strip_prefix(&ws.root).ok()
                                            .map(|r| r.to_string_lossy().replace('\\', "/"))
                                            .or_else(|| p.file_name().map(|f| f.to_string_lossy().to_string()))
                                    }).collect();
                                    self_written_at = std::time::Instant::now();
                                    println!("\x1b[32mOK\x1b[0m ({}ms)", start.elapsed().as_millis());
                                }
                                Err(e) => println!("\x1b[31mFAILED: {}\x1b[0m", e),
                            }
                        }

                        
                        
                        {
                            println!("\x1b[36mRestarting server...\x1b[0m");
                            let _ = server_process.kill();
                            let _ = server_process.wait();
                            match start_dev_server(&server_file, port_env.as_deref(), &allow_flags) {
                                Ok(p) => {
                                    println!("\x1b[32mServer restarted (PID {})\x1b[0m", p.id());
                                    server_process = p;
                                }
                                Err(e) => eprintln!("\x1b[31mServer restart failed: {}\x1b[0m", e),
                            }
                        }

                        
                        last_rebuild = std::time::Instant::now();
                    }
                    Ok(Err(e)) => eprintln!("\x1b[31mWatch error: {}\x1b[0m", e),
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        
                        match server_process.try_wait() {
                            Ok(Some(status)) => {
                                eprintln!("\x1b[31mServer exited with {}. Waiting for file changes to restart...\x1b[0m", status);
                                
                                if let Ok(Ok(_)) = rx.recv() {
                                    println!("\x1b[36mRestarting server...\x1b[0m");
                                    match start_dev_server(&server_file, port_env.as_deref(), &allow_flags) {
                                        Ok(p) => {
                                            println!("\x1b[32mServer restarted (PID {})\x1b[0m", p.id());
                                            server_process = p;
                                        }
                                        Err(e) => eprintln!("\x1b[31mServer restart failed: {}\x1b[0m", e),
                                    }
                                    last_rebuild = std::time::Instant::now();
                                }
                            }
                            _ => {}
                        }
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
                }
            }
            let _ = server_process.kill();
            Ok(())
        }

        Commands::Ekl { .. } => unreachable!("EKL commands handled in main()"),
        Commands::Img { .. } => unreachable!("img commands handled in main()"),
        Commands::Auth { .. } => unreachable!("auth commands handled in main()"),
    }
}

fn ekko_home() -> std::path::PathBuf {
    let h = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };
    std::path::PathBuf::from(h).join(".ekko")
}

fn handle_auth_command(command: AuthCommands) -> anyhow::Result<()> {
    use ekko_core::packages::registry::{load_user_config, save_user_config, RegistryClient, RegistryConfig};
    match command {
        AuthCommands::Status => {
            let cfg = load_user_config()?;
            println!("Registry: {}", cfg.effective_url());
            match cfg.active_account() {
                Some(a) => {
                    println!("Account:  {} (active)", a.name);
                    println!("Token:    {}", if a.token.is_some() { "set" } else { "none" });
                    println!("Cert:     {}", a.cert_path.clone().unwrap_or_else(|| "none".into()));
                }
                None => {
                    println!("Account:  (none active)");
                    let src = if std::env::var("PUBLISH_TOKEN").map(|t| !t.is_empty()).unwrap_or(false) {
                        "PUBLISH_TOKEN env"
                    } else if cfg.token.is_some() { "flat config token" } else { "none" };
                    println!("Token:    {}", src);
                }
            }
            if cfg.accounts.len() > 1 {
                println!("Accounts: {}", cfg.accounts.iter().map(|a| a.name.clone()).collect::<Vec<_>>().join(", "));
            }
            if let Some(tok) = cfg.effective_token() {
                let client = RegistryClient::new(RegistryConfig { url: cfg.effective_url(), token: Some(tok), ..Default::default() });
                match client.whoami() {
                    Ok(u) => println!("Verified: {} <{}>", u.username, u.email),
                    Err(e) => println!("Verify:   FAILED ({})", e),
                }
            }
            Ok(())
        }
        AuthCommands::Token { token, registry } => {
            let mut cfg = load_user_config()?;
            let url = registry.unwrap_or_else(|| cfg.effective_url());
            let tok = match token {
                Some(t) => t.trim().to_string(),
                None => {
                    use std::io::Write;
                    print!("Token: ");
                    std::io::stdout().flush().ok();
                    let mut s = String::new();
                    std::io::stdin().read_line(&mut s)?;
                    s.trim().to_string()
                }
            };
            if tok.is_empty() { anyhow::bail!("no token provided"); }
            let client = RegistryClient::new(RegistryConfig { url: url.clone(), token: Some(tok.clone()), ..Default::default() });
            let who = client.verify_token(&tok).map_err(|e| anyhow::anyhow!("token rejected by {}: {}", url, e))?;
            cfg.upsert_account(&who.username, Some(&url), Some(tok), None);
            cfg.set_current(Some(&who.username));
            save_user_config(&cfg)?;
            println!("Token verified and installed for '{}' (now active). Publishing uses this account.", who.username);
            Ok(())
        }
        AuthCommands::Cert { path } => {
            let mut cfg = load_user_config()?;
            let acct = cfg.current.clone()
                .ok_or_else(|| anyhow::anyhow!("no active account — run `ekko auth token` first so the cert attaches to the right account"))?;
            let src = std::path::Path::new(&path);
            if !src.exists() { anyhow::bail!("cert not found: {}", path); }
            let certs_dir = ekko_home().join("certs");
            std::fs::create_dir_all(&certs_dir)?;
            let fname = src.file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or_else(|| "cert.pem".into());
            let safe = acct.replace('@', "").replace('/', "_");
            let dest = certs_dir.join(format!("{}-{}", safe, fname));
            std::fs::copy(src, &dest)?;
            cfg.upsert_account(&acct, None, None, Some(dest.to_string_lossy().to_string()));
            save_user_config(&cfg)?;
            println!("Signing cert registered for '{}': {}", acct, dest.display());
            Ok(())
        }
        AuthCommands::Switch { name } => {
            let mut cfg = load_user_config()?;
            if !cfg.accounts.iter().any(|a| a.name == name) {
                let known = cfg.accounts.iter().map(|a| a.name.clone()).collect::<Vec<_>>().join(", ");
                anyhow::bail!("no account '{}'{}", name, if known.is_empty() { String::new() } else { format!(" (known: {})", known) });
            }
            cfg.set_current(Some(&name));
            save_user_config(&cfg)?;
            println!("Active account: {}", name);
            Ok(())
        }
        AuthCommands::Logout => {
            let mut cfg = load_user_config()?;
            cfg.set_current(None);
            save_user_config(&cfg)?;
            println!("Logged out. Publish now falls back to PUBLISH_TOKEN env or the flat config token.");
            Ok(())
        }
    }
}

fn handle_ekl_command(command: EklCommands) -> anyhow::Result<()> {
    match command {
        EklCommands::Inspect { target } => ekl_inspect(&target),
        EklCommands::Ls => ekl_list(),
        EklCommands::Store { command } => match command {
            EklStoreCommands::Set { path } => ekl_store_set(&path),
            EklStoreCommands::Clear => ekl_store_clear(),
            EklStoreCommands::Move { path } => ekl_store_move(&path),
        },
    }
}

fn ekl_inspect(target: &str) -> anyhow::Result<()> {
    let pkg = if std::path::Path::new(target).exists() {
        ekko_vfs::EklPackage::from_file(std::path::Path::new(target))
            .map_err(|e| anyhow::anyhow!("failed to read .ekl '{}': {}", target, e))?
    } else {
        let store = ekko_core::packages::store::store_path();
        let cwd = std::env::current_dir().unwrap_or_default();
        ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));

        let version = ekko_core::packages::workspace::get_workspace()
            .and_then(|ws| ws.lockfile.as_ref()?.packages.get(target).map(|p| p.version.clone()));

        let store_dir = if let Some(ver) = &version {
            store.join(target).join(ver)
        } else {
            let pkg_dir = store.join(target);
            if pkg_dir.exists() {
                let mut versions: Vec<_> = std::fs::read_dir(&pkg_dir)
                    .ok().into_iter().flatten().flatten()
                    .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
                    .collect();
                versions.sort_by_key(|e| e.file_name());
                if let Some(last) = versions.last() {
                    last.path()
                } else {
                    anyhow::bail!("package '{}' not found.\n  Not a file path and not in the store.", target);
                }
            } else {
                anyhow::bail!("package '{}' not found.\n  Not a file path and not in the store.\n  Try: ekko ekl inspect ./path/to/file.ekl", target);
            }
        };

        let manifest_path = store_dir.join("manifest.json");
        if !manifest_path.exists() {
            anyhow::bail!("package '{}' not found in store at {}", target, store_dir.display());
        }

        let manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(&manifest_path)?
        )?;

        let name = manifest["name"].as_str().unwrap_or(target);
        let ver = manifest["version"].as_str().unwrap_or("?");
        let pkg_type = manifest["project_type"].as_str().unwrap_or("lib");
        let entry = manifest["entry"].as_str();

        println!("\x1b[1;35m{}\x1b[0m \x1b[2mv{}\x1b[0m \x1b[36m({})\x1b[0m", name, ver, pkg_type);
        if let Some(e) = entry {
            println!("\x1b[2m  entry: {}\x1b[0m", e);
        }
        println!("\x1b[2m  store: {}\x1b[0m\n", store_dir.display());

        print_dir_tree(&store_dir, &store_dir, "", true)?;
        return Ok(());
    };

    let name = &pkg.metadata.name;
    let ver = &pkg.metadata.version;
    let pkg_type = pkg.metadata.project_type.as_deref().unwrap_or("lib");
    let entry = pkg.metadata.entry.as_deref();

    println!("\x1b[1;35m{}\x1b[0m \x1b[2mv{}\x1b[0m \x1b[36m({})\x1b[0m", name, ver, pkg_type);
    if let Some(e) = entry {
        println!("\x1b[2m  entry: {}\x1b[0m", e);
    }
    println!();

    let mut tree: std::collections::BTreeMap<String, Vec<(String, u32)>> = std::collections::BTreeMap::new();
    for entry in pkg.entries() {
        let path = &entry.path;
        let dir = if let Some(idx) = path.rfind('/') {
            &path[..idx]
        } else {
            ""
        };
        let file_name = if let Some(idx) = path.rfind('/') {
            &path[idx + 1..]
        } else {
            path
        };
        tree.entry(dir.to_string()).or_default().push((file_name.to_string(), entry.size));
    }

    let dirs: Vec<&String> = tree.keys().filter(|k| !k.is_empty()).collect();
    let root_files = tree.get("").cloned().unwrap_or_default();

    fn format_size(bytes: u32) -> String {
        if bytes >= 1_048_576 { format!("{:.1}M", bytes as f64 / 1_048_576.0) }
        else if bytes >= 1024 { format!("{:.1}K", bytes as f64 / 1024.0) }
        else { format!("{}B", bytes) }
    }

    let mut total_size: u64 = 0;
    let all_items: Vec<(bool, String, Option<u32>)> = {
        let mut items = Vec::new();
        for d in &dirs {
            items.push((true, d.to_string(), None));
            if let Some(files) = tree.get(d.as_str()) {
                for (f, sz) in files {
                    items.push((false, format!("{}/{}", d, f), Some(*sz)));
                }
            }
        }
        for (f, sz) in &root_files {
            items.push((false, f.clone(), Some(*sz)));
        }
        items
    };

    let mut i = 0;
    let len = all_items.len();
    while i < len {
        let (is_dir, ref path, size) = all_items[i];
        let is_last = i == len - 1 || (is_dir && {
            let mut j = i + 1;
            while j < len && !all_items[j].0 && all_items[j].1.starts_with(path.as_str()) { j += 1; }
            j == len
        });
        let connector = if is_last && !is_dir { "└── " } else if !is_dir { "├── " } else { "" };

        if is_dir {
            let dir_is_last = {
                let mut j = i + 1;
                while j < len && !all_items[j].0 && all_items[j].1.starts_with(&format!("{}/", path)) { j += 1; }
                j >= len || (j < len && all_items[j].0)
            };
            let prefix = if dirs.iter().position(|d| **d == *path) == Some(dirs.len() - 1) && root_files.is_empty() {
                "└── "
            } else {
                "├── "
            };
            println!("{}📁  \x1b[33m{}\x1b[0m", prefix, path);
            let sub_files = tree.get(path.as_str()).cloned().unwrap_or_default();
            let sub_len = sub_files.len();
            let bar = if prefix == "└── " { "    " } else { "│   " };
            for (fi, (fname, sz)) in sub_files.iter().enumerate() {
                total_size += *sz as u64;
                let sub_conn = if fi == sub_len - 1 { "└── " } else { "├── " };
                println!("{}{}📄  {} \x1b[2m({})\x1b[0m", bar, sub_conn, fname, format_size(*sz));
            }
            while i + 1 < len && !all_items[i + 1].0 && all_items[i + 1].1.starts_with(&format!("{}/", path)) {
                i += 1;
            }
        } else {
            if let Some(sz) = size {
                total_size += sz as u64;
                let prefix = if i == len - 1 { "└── " } else { "├── " };
                println!("{}📄  {} \x1b[2m({})\x1b[0m", prefix, path, format_size(sz));
            }
        }
        i += 1;
    }

    println!("\n\x1b[2m{} entries, {} total\x1b[0m", pkg.entries().len(), format_size(total_size as u32));
    Ok(())
}

fn print_dir_tree(root: &std::path::Path, dir: &std::path::Path, prefix: &str, is_root: bool) -> anyhow::Result<()> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != "manifest.json" || !is_root)
        .collect();
    entries.sort_by_key(|e| (e.file_type().map(|t| !t.is_dir()).unwrap_or(true), e.file_name()));

    let count = entries.len();
    for (i, entry) in entries.iter().enumerate() {
        let is_last = i == count - 1;
        let connector = if is_last { "└── " } else { "├── " };
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            println!("{}{}📁  \x1b[33m{}\x1b[0m", prefix, connector, name_str);
            let child_prefix = format!("{}{}", prefix, if is_last { "    " } else { "│   " });
            print_dir_tree(root, &entry.path(), &child_prefix, false)?;
        } else {
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let size_str = if size >= 1_048_576 { format!("{:.1}M", size as f64 / 1_048_576.0) }
                else if size >= 1024 { format!("{:.1}K", size as f64 / 1024.0) }
                else { format!("{}B", size) };
            println!("{}{}📄  {} \x1b[2m({})\x1b[0m", prefix, connector, name_str, size_str);
        }
    }
    Ok(())
}

fn ekl_list() -> anyhow::Result<()> {
    let store = ekko_core::packages::store::store_path();
    println!("EKL package store: {}", store.display());

    if !store.exists() {
        println!("  (empty, no packages installed)");
        return Ok(());
    }

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut total_size: u64 = 0;

    fn subdirs(dir: &std::path::Path) -> Vec<std::fs::DirEntry> {
        let mut v: Vec<std::fs::DirEntry> = std::fs::read_dir(dir).ok().into_iter().flatten()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
            .collect();
        v.sort_by_key(|e| e.file_name());
        v
    }

    fn collect(rows: &mut Vec<Vec<String>>, total: &mut u64, name: &str, pkg_dir: &std::path::Path) {
        for ver in subdirs(pkg_dir) {
            let ver_str = ver.file_name().to_string_lossy().to_string();
            let ver_dir = ver.path();
            let manifest = ver_dir.join("manifest.json");
            let pkg_type = if manifest.exists() {
                let content = std::fs::read_to_string(&manifest).unwrap_or_default();
                let m: serde_json::Value = serde_json::from_str(&content).unwrap_or_default();
                m["project_type"].as_str().unwrap_or("lib").to_string()
            } else {
                "lib".to_string()
            };
            let size = dir_total_size(&ver_dir);
            *total += size;
            rows.push(vec![name.to_string(), format!("v{}", ver_str), pkg_type, human_size(size)]);
        }
    }

    for entry in subdirs(&store) {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('@') {
            
            for pkg in subdirs(&entry.path()) {
                let full = format!("{}/{}", name, pkg.file_name().to_string_lossy());
                collect(&mut rows, &mut total_size, &full, &pkg.path());
            }
        } else {
            collect(&mut rows, &mut total_size, &name, &entry.path());
        }
    }

    if rows.is_empty() {
        println!("  (empty, no packages installed)");
        return Ok(());
    }

    let color = banner::stdout_color();
    print!("{}", banner::table(
        &["Package", "Version", "Type", "Size"],
        &rows,
        &[banner::Align::Left, banner::Align::Left, banner::Align::Left, banner::Align::Right],
        color,
        |col, val| if col == 2 { type_color(val) } else { "" },
    ));
    println!("  {} package(s), {} total", rows.len(), human_size(total_size));
    Ok(())
}

fn human_size(bytes: u64) -> String {
    let mb = bytes as f64 / 1_048_576.0;
    if mb >= 1.0 { format!("{:.1}M", mb) } else { format!("{:.3}M", mb) }
}

fn type_color(t: &str) -> &'static str {
    match t {
        "run" => "\x1b[32m",              
        "lib" => "\x1b[36m",              
        "tool" => "\x1b[33m",             
        "test" => "\x1b[35m",             
        "gui" => "\x1b[34m",              
        "tui" => "\x1b[38;2;255;138;76m", 
        _ => "\x1b[2m",                   
    }
}

fn dir_total_size(dir: &std::path::Path) -> u64 {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

fn ekl_store_set(new_path: &std::path::Path) -> anyhow::Result<()> {
    let old_store = ekko_core::packages::store::store_path();

    let new_store = std::fs::canonicalize(new_path).unwrap_or_else(|_| new_path.to_path_buf());
    std::fs::create_dir_all(&new_store)?;

    if old_store.exists() {
        println!("\x1b[33mRemoving old store: {}\x1b[0m", old_store.display());
        std::fs::remove_dir_all(&old_store)?;
    }

    write_store_config(&new_store)?;
    println!("\x1b[32mStore path set to: {}\x1b[0m", new_store.display());
    Ok(())
}

fn ekl_store_clear() -> anyhow::Result<()> {
    let store = ekko_core::packages::store::store_path();
    if !store.exists() {
        println!("\x1b[2mStore is already empty.\x1b[0m");
        return Ok(());
    }
    let count = std::fs::read_dir(&store)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .count();
    std::fs::remove_dir_all(&store)?;
    std::fs::create_dir_all(&store)?;
    println!("\x1b[32mCleared {} package(s) from store.\x1b[0m", count);
    println!("\x1b[2m  path: {}\x1b[0m", store.display());
    Ok(())
}

fn ekl_store_move(new_path: &std::path::Path) -> anyhow::Result<()> {
    let old_store = ekko_core::packages::store::store_path();

    if !old_store.exists() {
        std::fs::create_dir_all(new_path)?;
        write_store_config(new_path)?;
        println!("\x1b[32mStore path set to: {}\x1b[0m (was empty)", new_path.display());
        return Ok(());
    }

    if let Some(parent) = new_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    println!("\x1b[36mMoving store: {} → {}\x1b[0m", old_store.display(), new_path.display());
    copy_dir_all(&old_store, new_path)?;
    std::fs::remove_dir_all(&old_store)?;

    write_store_config(new_path)?;
    println!("\x1b[32mStore moved to: {}\x1b[0m", new_path.display());
    Ok(())
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> anyhow::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}

fn write_store_config(store_path: &std::path::Path) -> anyhow::Result<()> {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };
    let config_dir = std::path::PathBuf::from(home).join(".ekko");
    std::fs::create_dir_all(&config_dir)?;
    let config_path = config_dir.join("config.json");

    let mut config: serde_json::Value = if config_path.exists() {
        serde_json::from_str(&std::fs::read_to_string(&config_path)?).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    config["store_path"] = serde_json::json!(store_path.to_string_lossy());
    std::fs::write(&config_path, serde_json::to_string_pretty(&config)?)?;
    Ok(())
}

fn scaffold_write(p: &std::path::Path, content: &str) -> anyhow::Result<()> {
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if p.exists() {
        println!("  \x1b[33mskip\x1b[0m {} (already exists)", p.display());
    } else {
        std::fs::write(p, content)?;
        println!("  \x1b[32mcreate\x1b[0m {}", p.display());
    }
    Ok(())
}

async fn init_project(kind: Option<String>, path: Option<PathBuf>, name: Option<String>, demo: bool) -> anyhow::Result<()> {

    let explicit_path = path.is_some();
    let cwd = std::env::current_dir().unwrap_or_default();
    let base = path.unwrap_or_else(|| cwd.clone());
    let dir_name = base.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "my-app".to_string());

    let (chosen_kind, chosen_name) = match kind {
        Some(k) => (k, name.unwrap_or_else(|| dir_name.clone())),
        None => {

            
            ekko_core::engine::v8_runtime::set_permissions(
                ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());
            unsafe {
                std::env::set_var("EKKO_INIT_DEFAULT_NAME", name.as_deref().unwrap_or(dir_name.as_str()));
                std::env::remove_var("EKKO_INIT_RESULT");
            }
            ekko_core::engine::v8_runtime::execute_module_async(
                include_str!("scaffold/init-picker.ts"), "init-picker").await?;
            let raw = std::env::var("EKKO_INIT_RESULT").unwrap_or_default();
            if raw.trim().is_empty() {
                println!("\x1b[33mAborted.\x1b[0m");
                return Ok(());
            }
            let v: serde_json::Value = serde_json::from_str(&raw)
                .map_err(|e| anyhow::anyhow!("init picker returned an invalid result: {}", e))?;
            let k = v.get("type").and_then(|t| t.as_str()).unwrap_or("run").to_string();
            let n = v.get("name").and_then(|t| t.as_str()).filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .or(name)
                .unwrap_or_else(|| dir_name.clone());
            (k, n)
        }
    };

    let target = if explicit_path { base } else { prompt_init_location(&cwd, &chosen_name) };
    std::fs::create_dir_all(&target)?;

    match chosen_kind.as_str() {
        
        "workspace" => return scaffold_workspace(&target, &chosen_name),
        "run"  => scaffold_run(&target, &chosen_name)?,
        "lib"  => scaffold_lib(&target, &chosen_name)?,

        "cli" | "tool" => scaffold_tool(&target, &chosen_name)?,
        "test" => scaffold_test(&target, &chosen_name)?,
        "gui"  => if demo { gui_init_demo(&target, &chosen_name)? } else { gui_init(&target, &chosen_name)? },
        "tui"  => if demo { tui_init_demo(&target, &chosen_name)? } else { tui_init(&target, &chosen_name)? },
        other  => anyhow::bail!(
            "unknown project type '{}'. Valid types: run, lib, cli, test, gui, tui, workspace.\n\
             Use `ekko init <type>` (with `--path <dir>` for the directory), or `ekko init` for an interactive picker.",
            other),
    }

    register_project_in_workspace(&target, &chosen_name);
    Ok(())
}

fn prompt_init_location(cwd: &std::path::Path, name: &str) -> PathBuf {
    use std::io::{IsTerminal, Write, BufRead};
    let sub = cwd.join(name);
    if !std::io::stdin().is_terminal() { return sub; }
    let g = if std::env::var_os("NO_COLOR").is_none() { "\x1b[38;2;61;214;168m" } else { "" };
    let dim = if std::env::var_os("NO_COLOR").is_none() { "\x1b[2m" } else { "" };
    let r = if std::env::var_os("NO_COLOR").is_none() { "\x1b[0m" } else { "" };
    print!("  {g}?{r} Create in {g}./{name}{r} (new folder) or {g}.{r} (here)? {dim}[./{name}]{r} ");
    let _ = std::io::stdout().flush();
    let mut line = String::new();
    if std::io::stdin().lock().read_line(&mut line).is_err() { return sub; }
    match line.trim().to_lowercase().as_str() {
        "." | "here" | "h" => cwd.to_path_buf(),
        _ => sub,
    }
}

fn scaffold_workspace(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    println!("\x1b[1;35mScaffolding workspace: {}\x1b[0m\n", name);
    std::fs::create_dir_all(target)?;
    let cfg = target.join("ekko.json");
    if cfg.exists() {
        anyhow::bail!(
            "{} already exists — refusing to overwrite. Run this in an empty directory (or remove the file first).",
            cfg.display());
    }
    scaffold_write(&cfg, &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"workspace\": {{\n    \"members\": [],\n    \"map\": {{}}\n  }}\n}}\n",
        name))?;
    println!("\n\x1b[32mDone!\x1b[0m Add projects with \x1b[1mekko init <type> --path <dir> --name <name>\x1b[0m");
    println!("from this directory — each one registers itself in the workspace map.");
    Ok(())
}

fn register_project_in_workspace(project_dir: &std::path::Path, project_name: &str) {
    let abs = std::fs::canonicalize(project_dir).unwrap_or_else(|_| project_dir.to_path_buf());
    let mut dir = abs.parent(); 
    while let Some(d) = dir {
        let cfg = d.join("ekko.json");
        if cfg.exists() {
            if let Ok(text) = std::fs::read_to_string(&cfg) {
                let clean = ekko_core::packages::workspace::strip_jsonc_comments(
                    ekko_core::packages::workspace::strip_bom(&text));
                if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&clean) {
                    if v.get("workspace").is_some() {
                        if let Ok(rel) = abs.strip_prefix(d) {
                            let reldir = rel.to_string_lossy().replace('\\', "/");
                            if !reldir.is_empty() && reldir != "."
                                && update_workspace_entry(&mut v, project_name, &reldir)
                            {
                                if let Ok(out) = serde_json::to_string_pretty(&v) {
                                    if std::fs::write(&cfg, out + "\n").is_ok() {
                                        println!("\n\x1b[36mRegistered\x1b[0m \"{}\": \"{}\" in {}",
                                            project_name, reldir, cfg.display());
                                    }
                                }
                            }
                        }
                        return; 
                    }
                }
            }
        }
        dir = d.parent();
    }
}

fn update_workspace_entry(v: &mut serde_json::Value, name: &str, reldir: &str) -> bool {
    let ws = match v.get_mut("workspace").and_then(|w| w.as_object_mut()) {
        Some(w) => w, None => return false,
    };
    let mut changed = false;
    let map = ws.entry("map").or_insert_with(|| serde_json::json!({}));
    if let Some(m) = map.as_object_mut() {
        if m.get(name).and_then(|x| x.as_str()) != Some(reldir) {
            m.insert(name.to_string(), serde_json::Value::String(reldir.to_string()));
            changed = true;
        }
    }
    let members = ws.entry("members").or_insert_with(|| serde_json::json!([]));
    if let Some(arr) = members.as_array_mut() {
        let covered = arr.iter().filter_map(|x| x.as_str()).any(|p| member_pattern_covers(p, reldir));
        if !covered {
            arr.push(serde_json::Value::String(reldir.to_string()));
            changed = true;
        }
    }
    changed
}

fn member_pattern_covers(pattern: &str, reldir: &str) -> bool {
    if pattern == reldir { return true; }
    if let Some(prefix) = pattern.strip_suffix("/**") {
        return reldir == prefix || reldir.starts_with(&format!("{}/", prefix));
    }
    if let Some(prefix) = pattern.strip_suffix("/*") {
        return reldir.strip_prefix(&format!("{}/", prefix)).map_or(false, |rest| !rest.contains('/'));
    }
    false
}

fn scaffold_run(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    println!("\x1b[1;35mScaffolding run project: {}\x1b[0m\n", name);
    scaffold_write(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"run\",\n  \"entry\": \"main.ts\",\n  \"permissions\": {{\n    \"net\": true\n  }}\n}}\n",
        name))?;
    scaffold_write(&target.join("main.ts"), include_str!("scaffold/run/main.ts"))?;
    println!("\n\x1b[32mDone!\x1b[0m Run \x1b[1mekko run main.ts\x1b[0m, then open \x1b[1mhttp://localhost:3000\x1b[0m.");
    Ok(())
}

fn scaffold_lib(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    println!("\x1b[1;35mScaffolding lib project: {}\x1b[0m\n", name);
    scaffold_write(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"lib\",\n  \"exports\": {{\n    \".\": \"src/index.ts\"\n  }}\n}}\n",
        name))?;
    scaffold_write(&target.join("src").join("index.ts"), include_str!("scaffold/lib/index.ts"))?;
    println!("\n\x1b[32mDone!\x1b[0m Build with \x1b[1mekko build\x1b[0m, publish with \x1b[1mekko publish\x1b[0m.");
    Ok(())
}

fn scaffold_tool(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    println!("\x1b[1;35mScaffolding tool project: {}\x1b[0m\n", name);
    scaffold_write(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"tool\",\n  \"bin\": {{\n    \"{}\": \"src/cli.ts\"\n  }},\n  \"permissions\": {{}}\n}}\n",
        name, name))?;
    let cli_src = include_str!("scaffold/tool/cli.ts").replace("{{NAME}}", name);
    scaffold_write(&target.join("src").join("cli.ts"), &cli_src)?;
    println!("\n\x1b[32mDone!\x1b[0m Run it with \x1b[1mekko x {} hello world\x1b[0m.", name);
    Ok(())
}

fn scaffold_test(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    println!("\x1b[1;35mScaffolding test project: {}\x1b[0m\n", name);
    scaffold_write(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"test\"\n}}\n",
        name))?;
    scaffold_write(&target.join("src").join("example.test.ts"), include_str!("scaffold/test/example.test.ts"))?;
    println!("\n\x1b[32mDone!\x1b[0m Run tests with \x1b[1mekko test\x1b[0m.");
    Ok(())
}

fn handle_gui_command(command: GuiCommands) -> anyhow::Result<()> {
    match command {
        GuiCommands::Run { package, path, ekl } => {
            if let Some(ekl_path) = ekl {
                apply_workspace_permissions_from_dir(&std::env::current_dir().unwrap_or_default());
                run_gui_from_ekl(&ekl_path)
            } else if let Some(ref pkg_name) = package {
                if std::path::Path::new(pkg_name).is_dir() {
                    let (project_dir, entry) = resolve_gui_project(Some(PathBuf::from(pkg_name)))?;
                    apply_workspace_permissions_from_dir(&project_dir);
                    let title = read_gui_name(&project_dir);
                    ekko_gui::run(project_dir.join(&entry), title)
                } else {
                    apply_workspace_permissions_from_dir(&std::env::current_dir().unwrap_or_default());
                    let (store_dir, entry, title) = resolve_store_package(pkg_name, "gui")?;
                    ekko_gui::run(store_dir.join(&entry), title)
                }
            } else {
                let (project_dir, entry) = resolve_gui_project(path)?;
                apply_workspace_permissions_from_dir(&project_dir);
                let title = read_gui_name(&project_dir);
                ekko_gui::run(project_dir.join(&entry), title)
            }
        }
        GuiCommands::Dev { path } => {
            ekko_core::engine::v8_runtime::set_permissions(ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());
            let (project_dir, entry) = resolve_gui_project(path)?;
            let title = read_gui_name(&project_dir);
            ekko_gui::run_dev(project_dir.join(&entry), title, project_dir)
        }
    }
}

fn resolve_gui_project(path: Option<PathBuf>) -> anyhow::Result<(PathBuf, String)> {
    let dir = path.unwrap_or_else(|| std::env::current_dir().unwrap());
    let dir = std::fs::canonicalize(&dir).unwrap_or(dir);
    let config_path = dir.join("ekko.json");
    if !config_path.exists() {
        anyhow::bail!("No ekko.json found in {}. Run 'ekko init gui' first.", dir.display());
    }
    let content = std::fs::read_to_string(&config_path)?;
    let config: serde_json::Value = serde_json::from_str(&content)?;
    if config.get("type").and_then(|t| t.as_str()) != Some("gui") {
        anyhow::bail!("Project type is not 'gui'. Expected \"type\": \"gui\" in ekko.json");
    }
    let entry = config.get("entry")
        .and_then(|e| e.as_str())
        .unwrap_or("app.ts")
        .to_string();
    Ok((dir, entry))
}

fn read_gui_name(project_dir: &std::path::Path) -> String {
    let config_path = project_dir.join("ekko.json");
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(name) = config.get("name").and_then(|n| n.as_str()) {
                return name.to_string();
            }
        }
    }
    "EkkoJS".to_string()
}

fn gui_init(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    std::fs::create_dir_all(target)?;
    let ui_dir = target.join("ui");
    let frameless_dir = ui_dir.join("frameless");
    std::fs::create_dir_all(&frameless_dir)?;

    let write_if_missing = |path: &std::path::Path, content: &str| -> anyhow::Result<()> {
        if path.exists() {
            println!("  \x1b[33mskip\x1b[0m {} (already exists)", path.display());
        } else {
            std::fs::write(path, content)?;
            println!("  \x1b[32mcreate\x1b[0m {}", path.display());
        }
        Ok(())
    };

    println!("\x1b[1;35mScaffolding GUI project: {}\x1b[0m\n", name);

    write_if_missing(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"gui\",\n  \"entry\": \"app.ts\",\n  \"permissions\": {{}}\n}}\n",
        name
    ))?;

    write_if_missing(&target.join("app.ts"), include_str!("scaffold/gui/app.ts"))?;
    write_if_missing(&ui_dir.join("_core.ts"), include_str!("scaffold/gui/_core.ts"))?;
    write_if_missing(&ui_dir.join("index.html"), include_str!("scaffold/gui/index.html"))?;
    write_if_missing(&ui_dir.join("app.ts"), include_str!("scaffold/gui/ui-app.ts"))?;
    write_if_missing(&ui_dir.join("style.css"), include_str!("scaffold/gui/style.css"))?;
    write_if_missing(&frameless_dir.join("index.html"), include_str!("scaffold/gui/frameless/index.html"))?;

    println!("\n\x1b[32mDone!\x1b[0m From this folder run \x1b[1mekko run\x1b[0m to start.");
    println!("\nThe demo shows:");
    println!("  - Multi-window (buttons / File menu / tray)");
    println!("  - System frame and custom frameless window (HTML titlebar)");
    println!("  - Broadcast (reaches every window) vs direct messaging (one window)");
    println!("  - System tray with a context menu");
    println!("  - UI served over the internal protocol (no HTTP/TCP port)");
    Ok(())
}

fn gui_init_demo(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    std::fs::create_dir_all(target)?;
    let ui_dir = target.join("ui");
    std::fs::create_dir_all(&ui_dir)?;
    let frameless_dir = ui_dir.join("frameless");
    std::fs::create_dir_all(&frameless_dir)?;

    let write_if_missing = |path: &std::path::Path, content: &str| -> anyhow::Result<()> {
        if path.exists() {
            println!("  \x1b[33mskip\x1b[0m {} (already exists)", path.display());
        } else {
            std::fs::write(path, content)?;
            println!("  \x1b[32mcreate\x1b[0m {}", path.display());
        }
        Ok(())
    };

    println!("\x1b[1;35mScaffolding GUI demo: {}\x1b[0m\n", name);

    write_if_missing(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"gui\",\n  \"entry\": \"app.ts\"\n}}\n",
        name
    ))?;

    write_if_missing(&target.join("app.ts"), include_str!("scaffold/gui-demo/app.ts"))?;
    write_if_missing(&ui_dir.join("_core.ts"), include_str!("scaffold/gui-demo/_core.ts"))?;
    write_if_missing(&ui_dir.join("index.html"), include_str!("scaffold/gui-demo/index.html"))?;
    write_if_missing(&ui_dir.join("app.ts"), include_str!("scaffold/gui-demo/ui-app.ts"))?;
    write_if_missing(&ui_dir.join("style.css"), include_str!("scaffold/gui-demo/style.css"))?;
    write_if_missing(&frameless_dir.join("index.html"), include_str!("scaffold/gui-demo/frameless/index.html"))?;

    println!("\n\x1b[32mDone!\x1b[0m Run \x1b[1mekko run -p {}\x1b[0m to start.", target.display());
    println!("\nDemo features:");
    println!("  - Window options (size, min/max, theme, decorations)");
    println!("  - Native menu (File > New Window, Frameless Window, Quit)");
    println!("  - System tray with context menu");
    println!("  - Multi-window (File > New Window)");
    println!("  - Frameless window with custom HTML titlebar");
    println!("  - Bidirectional IPC (V8 <-> webview)");
    println!("  - TypeScript in webview (SWC transpile on-the-fly)");
    Ok(())
}

fn handle_tui_command(command: TuiCommands) -> anyhow::Result<()> {
    match command {
        TuiCommands::Run { package, path, ekl } => {
            if let Some(ekl_path) = ekl {
                apply_workspace_permissions_from_dir(&std::env::current_dir().unwrap_or_default());
                run_tui_from_ekl(&ekl_path)
            } else if let Some(ref pkg_name) = package {
                if std::path::Path::new(pkg_name).is_dir() {
                    let (project_dir, entry) = resolve_tui_project(Some(PathBuf::from(pkg_name)))?;
                    apply_workspace_permissions_from_dir(&project_dir);
                    let title = read_tui_name(&project_dir);
                    ekko_tui::run(project_dir.join(&entry), title)
                } else {
                    apply_workspace_permissions_from_dir(&std::env::current_dir().unwrap_or_default());
                    let (store_dir, entry, title) = resolve_store_package(pkg_name, "tui")?;
                    ekko_tui::run(store_dir.join(&entry), title)
                }
            } else {
                let (project_dir, entry) = resolve_tui_project(path)?;
                apply_workspace_permissions_from_dir(&project_dir);
                let title = read_tui_name(&project_dir);
                ekko_tui::run(project_dir.join(&entry), title)
            }
        }
        TuiCommands::Dev { path } => {
            ekko_core::engine::v8_runtime::set_permissions(ekko_core::ffi::ffi_runtime::PermissionSet::allow_all());
            let (project_dir, entry) = resolve_tui_project(path)?;
            let title = read_tui_name(&project_dir);
            ekko_tui::run_dev(project_dir.join(&entry), title, project_dir)
        }
    }
}

fn resolve_tui_project(path: Option<PathBuf>) -> anyhow::Result<(PathBuf, String)> {
    let dir = path.unwrap_or_else(|| std::env::current_dir().unwrap());
    let dir = std::fs::canonicalize(&dir).unwrap_or(dir);
    let config_path = dir.join("ekko.json");
    if !config_path.exists() {
        anyhow::bail!("No ekko.json found in {}. Run 'ekko init tui' first.", dir.display());
    }
    let content = std::fs::read_to_string(&config_path)?;
    let config: serde_json::Value = serde_json::from_str(&content)?;
    if config.get("type").and_then(|t| t.as_str()) != Some("tui") {
        anyhow::bail!("Project type is not 'tui'. Expected \"type\": \"tui\" in ekko.json");
    }
    let entry = config.get("entry")
        .and_then(|e| e.as_str())
        .unwrap_or("app.tsx")
        .to_string();
    Ok((dir, entry))
}

fn read_tui_name(project_dir: &std::path::Path) -> String {
    let config_path = project_dir.join("ekko.json");
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(name) = config.get("name").and_then(|n| n.as_str()) {
                return name.to_string();
            }
        }
    }
    "EkkoJS TUI".to_string()
}

const TUI_DOC_PAGES: &[(&str, &str)] = &[
    ("01-getting-started/01-welcome.md",      include_str!("scaffold/tui/docs/01-getting-started/01-welcome.md")),
    ("01-getting-started/02-running-code.md", include_str!("scaffold/tui/docs/01-getting-started/02-running-code.md")),
    ("01-getting-started/03-typescript.md",   include_str!("scaffold/tui/docs/01-getting-started/03-typescript.md")),
    ("02-core/04-modules.md",                 include_str!("scaffold/tui/docs/02-core/04-modules.md")),
    ("02-core/05-permissions.md",             include_str!("scaffold/tui/docs/02-core/05-permissions.md")),
    ("03-standard-library/06-files.md",       include_str!("scaffold/tui/docs/03-standard-library/06-files.md")),
    ("03-standard-library/07-networking.md",  include_str!("scaffold/tui/docs/03-standard-library/07-networking.md")),
    ("04-building-apps/08-terminal-uis.md",   include_str!("scaffold/tui/docs/04-building-apps/08-terminal-uis.md")),
    ("04-building-apps/09-desktop-apps.md",   include_str!("scaffold/tui/docs/04-building-apps/09-desktop-apps.md")),
    ("05-packages/10-packages.md",            include_str!("scaffold/tui/docs/05-packages/10-packages.md")),
];

fn tui_init(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    std::fs::create_dir_all(target)?;
    let docs_dir = target.join("docs");
    std::fs::create_dir_all(&docs_dir)?;

    let write_if_missing = |path: &std::path::Path, content: &str| -> anyhow::Result<()> {
        if path.exists() {
            println!("  \x1b[33mskip\x1b[0m {} (already exists)", path.display());
        } else {
            std::fs::write(path, content)?;
            println!("  \x1b[32mcreate\x1b[0m {}", path.display());
        }
        Ok(())
    };

    println!("\x1b[1;35mScaffolding TUI project: {}\x1b[0m\n", name);

    write_if_missing(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"tui\",\n  \"entry\": \"app.tsx\",\n  \"permissions\": {{\n    \"fs\": [\"docs/**\"]\n  }}\n}}\n",
        name
    ))?;

    let app_src = include_str!("scaffold/tui/app.tsx").replace("{{NAME}}", name);
    write_if_missing(&target.join("app.tsx"), &app_src)?;

    for (file, content) in TUI_DOC_PAGES {
        let dest = docs_dir.join(file);
        if let Some(parent) = dest.parent() { std::fs::create_dir_all(parent)?; }
        write_if_missing(&dest, content)?;
    }

    println!("\n\x1b[32mDone!\x1b[0m From this folder run \x1b[1mekko run\x1b[0m to browse the docs.");
    Ok(())
}

fn tui_init_demo(target: &std::path::Path, name: &str) -> anyhow::Result<()> {
    std::fs::create_dir_all(target)?;

    let write_if_missing = |path: &std::path::Path, content: &str| -> anyhow::Result<()> {
        if path.exists() {
            println!("  \x1b[33mskip\x1b[0m {} (already exists)", path.display());
        } else {
            std::fs::write(path, content)?;
            println!("  \x1b[32mcreate\x1b[0m {}", path.display());
        }
        Ok(())
    };

    println!("\x1b[1;35mScaffolding TUI demo: {}\x1b[0m\n", name);

    write_if_missing(&target.join("ekko.json"), &format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"tui\",\n  \"entry\": \"app.tsx\"\n}}\n",
        name
    ))?;

    write_if_missing(&target.join("app.tsx"), include_str!("scaffold/tui-demo/app.tsx"))?;

    println!("\n\x1b[32mDone!\x1b[0m Run \x1b[1mekko run -p {}\x1b[0m to start.", target.display());
    println!("\nDemo features:");
    println!("  - SplitPane (sidebar + main content)");
    println!("  - SelectInput in sidebar navigation");
    println!("  - TextInput with search");
    println!("  - ProgressBar + Spinner");
    println!("  - Table with auto column widths");
    println!("  - SyntaxText (Rust code highlighting)");
    println!("  - Focus cycling (Tab)");
    println!("  - Global shortcuts (Ctrl+Q quit)");
    println!("  - Adaptive layout (useResize)");
    Ok(())
}

fn find_member_by_path<'a>(ws: &'a ekko_core::packages::workspace::Workspace, path: &PathBuf) -> Option<&'a ekko_core::packages::workspace::Member> {
    let path_str = path.to_string_lossy().replace('\\', "/");
    let path_str = path_str.trim_end_matches('/');

    for m in ws.members.values() {
        let member_rel = m.root_dir.strip_prefix(&ws.root)
            .unwrap_or(&m.root_dir)
            .to_string_lossy()
            .replace('\\', "/");
        let member_rel = member_rel.trim_end_matches('/');
        if member_rel == path_str || member_rel.ends_with(path_str) {
            return Some(m);
        }
    }

    ws.members.get(path_str).or_else(|| ws.members.get(&format!("@{}", path_str)))
}

fn parse_pkg_spec(spec: &str) -> (String, Option<String>) {
    let from = if spec.starts_with('@') { 1 } else { 0 };
    if let Some(rel) = spec[from..].find('@') {
        let at = from + rel;
        return (spec[..at].to_string(), Some(spec[at + 1..].to_string()));
    }
    (spec.to_string(), None)
}

fn find_member_by_cwd<'a>(ws: &'a ekko_core::packages::workspace::Workspace, cwd: &PathBuf) -> Option<&'a ekko_core::packages::workspace::Member> {
    let abs_cwd = std::fs::canonicalize(cwd).unwrap_or(cwd.clone());
    for m in ws.members.values() {
        let abs_member = std::fs::canonicalize(&m.root_dir).unwrap_or(m.root_dir.clone());
        if abs_cwd == abs_member || abs_cwd.starts_with(&abs_member) {
            return Some(m);
        }
    }
    None
}

fn rewrite_css_imports_in_tree(root: &std::path::Path) -> Vec<(PathBuf, String)> {
    let mut changed: Vec<(PathBuf, String)> = Vec::new();
    for e in walkdir::WalkDir::new(root).into_iter()
        .filter_entry(|e| { let n = e.file_name().to_string_lossy(); !n.starts_with('.') && n != "node_modules" && n != ".ekko" && n != "dist" && n != "build" })
        .flatten()
        .filter(|e| e.file_type().is_file())
    {
        let ext = e.path().extension().and_then(|x| x.to_str()).unwrap_or("");
        if !matches!(ext, "ts" | "tsx" | "jsx" | "js") { continue; }
        let content = match std::fs::read_to_string(e.path()) { Ok(c) => c, Err(_) => continue };
        if !content.contains(".scss") && !content.contains(".sass") { continue; }
        let rewritten = rewrite_global_css_ext(&content);
        if rewritten != content && std::fs::write(e.path(), &rewritten).is_ok() {
            changed.push((e.path().to_path_buf(), content));
        }
    }
    changed
}

fn rewrite_global_css_ext(src: &str) -> String {
    let mut out = src.to_string();
    for q in ['"', '\''] {
        for ext in [".scss", ".sass"] {
            
            let from = format!("{}{}", ext, q);          
            let to = format!(".css{}", q);
            
            let mut result = String::with_capacity(out.len());
            let mut rest = out.as_str();
            while let Some(idx) = rest.find(&from) {
                let (head, tail) = rest.split_at(idx);
                let is_module = head.ends_with(".module");
                result.push_str(head);
                if is_module { result.push_str(&from); } else { result.push_str(&to); }
                rest = &tail[from.len()..];
            }
            result.push_str(rest);
            out = result;
        }
    }
    out
}

fn restore_files(originals: &[(PathBuf, String)]) {
    let mut seen = std::collections::HashSet::new();
    for (path, original) in originals {
        if seen.insert(path.clone()) { let _ = std::fs::write(path, original); }
    }
}

fn fnv1a_hex(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.bytes() { h ^= b as u64; h = h.wrapping_mul(0x100000001b3); }
    format!("{:016x}", h)
}

fn css_module_logical_name(ws: &ekko_core::packages::workspace::Workspace, abs: &std::path::Path) -> String {
    let root = std::fs::canonicalize(&ws.root).unwrap_or_else(|_| ws.root.clone());
    let canon = std::fs::canonicalize(abs).unwrap_or_else(|_| abs.to_path_buf());
    if let Ok(rel) = canon.strip_prefix(&root) {
        return rel.to_string_lossy().replace('\\', "/");
    }
    abs.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()
}

fn rewrite_css_module_imports_in_tree(ws: &ekko_core::packages::workspace::Workspace) -> Vec<(PathBuf, String)> {
    use ekko_core::parsers::css::{convert_css_module, SassSyntax};
    let cssmod_dir = ws.root.join(".ekko").join("build").join("cssmod");
    let _ = std::fs::create_dir_all(&cssmod_dir);
    let mut changed: Vec<(PathBuf, String)> = Vec::new();

    for e in walkdir::WalkDir::new(&ws.root).into_iter()
        .filter_entry(|e| { let n = e.file_name().to_string_lossy(); !n.starts_with('.') && n != "node_modules" && n != ".ekko" && n != "dist" && n != "build" })
        .flatten()
        .filter(|e| e.file_type().is_file())
    {
        let ext = e.path().extension().and_then(|x| x.to_str()).unwrap_or("");
        if !matches!(ext, "ts" | "tsx" | "jsx" | "js") { continue; }
        let content = match std::fs::read_to_string(e.path()) { Ok(c) => c, Err(_) => continue };
        if !content.contains(".module.scss") && !content.contains(".module.sass") && !content.contains(".module.css") { continue; }
        let src_dir = e.path().parent().map(|p| p.to_path_buf()).unwrap_or_default();

        
        let mut out = String::with_capacity(content.len());
        let mut rest = content.as_str();
        let mut mutated = false;
        loop {
            
            let Some(marker) = rest.find(".module.") else { out.push_str(rest); break; };
            
            let after = &rest[marker..];
            let mut endq = None;
            for (i, ch) in after.char_indices() {
                if ch == '"' || ch == '\'' { endq = Some(i); break; }
            }
            let Some(endq_rel) = endq else { out.push_str(rest); break; };
            let ext_part = &after[..endq_rel]; 
            if !(ext_part.ends_with(".scss") || ext_part.ends_with(".sass") || ext_part.ends_with(".css")) {
                
                let upto = marker + endq_rel + 1;
                out.push_str(&rest[..upto]);
                rest = &rest[upto..];
                continue;
            }
            
            let head = &rest[..marker];
            let openq = head.rfind(['"', '\'']);
            let Some(openq) = openq else { out.push_str(rest); break; };
            let spec = &rest[openq + 1..marker + endq_rel]; 
            
            let abs = if std::path::Path::new(spec).is_absolute() { PathBuf::from(spec) } else { src_dir.join(spec) };
            let abs = abs.canonicalize().unwrap_or(abs);
            let src = match std::fs::read_to_string(&abs) { Ok(s) => s, Err(_) => {
                
                let upto = marker + endq_rel + 1;
                out.push_str(&rest[..upto]);
                rest = &rest[upto..];
                continue;
            }};
            let logical = css_module_logical_name(ws, &abs);
            let syntax = if abs.extension().and_then(|x| x.to_str()) == Some("sass") { SassSyntax::Sass } else { SassSyntax::Scss };
            match convert_css_module(&src, &logical, syntax) {
                Ok(r) => {
                    let hash = fnv1a_hex(&logical);
                    let css_path = cssmod_dir.join(format!("{}.css", hash));
                    let js_path = cssmod_dir.join(format!("{}.module.css.js", hash));
                    let _ = std::fs::write(&css_path, &r.code);
                    
                    let mut entries: Vec<(&String, &String)> = r.classes.iter().collect();
                    entries.sort_by(|a, b| a.0.cmp(b.0));
                    let mut map_lit = String::from("{");
                    for (i, (k, v)) in entries.iter().enumerate() {
                        if i > 0 { map_lit.push(','); }
                        map_lit.push_str(&format!("{}:{}", serde_json::to_string(k).unwrap(), serde_json::to_string(v).unwrap()));
                    }
                    map_lit.push('}');
                    let js = format!("import \"./{}.css\";\nexport default {};\n", hash, map_lit);
                    let _ = std::fs::write(&js_path, js);
                    
                    out.push_str(&rest[..openq + 1]);
                    out.push_str(&js_path.to_string_lossy().replace('\\', "/"));
                    out.push('"'); 
                    
                    rest = &rest[marker + endq_rel + 1..];
                    mutated = true;
                }
                Err(err) => {
                    eprintln!("CSS module error in {}: {}", abs.display(), err);
                    let upto = marker + endq_rel + 1;
                    out.push_str(&rest[..upto]);
                    rest = &rest[upto..];
                }
            }
        }
        if mutated && out != content && std::fs::write(e.path(), &out).is_ok() {
            changed.push((e.path().to_path_buf(), content));
        }
    }
    changed
}

fn ensure_esbuild_available() -> anyhow::Result<PathBuf> {
    let store = ekko_core::packages::store::store_root();
    let esbuild_dir = store.join("@ekko").join("esbuild");
    if let Ok(entries) = std::fs::read_dir(&esbuild_dir) {
        for entry in entries.flatten() {
            let bin_name = if cfg!(windows) { "esbuild.exe" } else { "esbuild" };
            let bin = entry.path().join(bin_name);
            if bin.exists() {
                #[cfg(unix)]
                { let _ = std::fs::set_permissions(&bin, std::os::unix::fs::PermissionsExt::from_mode(0o755)); }
                return Ok(bin);
            }
        }
    }
    anyhow::bail!("esbuild not found. Run: ekko add @ekko/esbuild")
}

fn build_client(ws: &ekko_core::packages::workspace::Workspace) -> anyhow::Result<Vec<PathBuf>> {
    let pages_dir = ws.root.join("pages");
    let app_dir = ws.root.join("app");
    let entry_dir = if pages_dir.exists() { pages_dir } else if app_dir.exists() { app_dir } else { ws.root.join("src") };
    if !entry_dir.exists() { return Ok(Vec::new()); }

    let out_dir = ws.root.join(".ekko").join("build").join("client");
    let build_dir = ws.root.join(".ekko").join("build");
    std::fs::create_dir_all(&out_dir)?;

    let esbuild = ensure_esbuild_available()?;

    let mut entries: Vec<String> = Vec::new();
    for e in walkdir::WalkDir::new(&entry_dir).into_iter().flatten() {
        if !e.file_type().is_file() { continue; }
        let p = e.path();
        let name = p.file_name().unwrap_or_default().to_string_lossy();
        if name.starts_with("api") || name.contains(".test.") || name.starts_with("route.") { continue; }
        match p.extension().and_then(|e| e.to_str()) {
            Some("tsx" | "jsx" | "ts" | "js") => entries.push(p.to_string_lossy().to_string()),
            _ => {}
        }
    }
    if entries.is_empty() { return Ok(Vec::new()); }

    let styles_dir = ws.root.join("styles");
    let mut sass_compiled: Vec<(String, PathBuf)> = Vec::new();
    if styles_dir.exists() {
        let scss_out = build_dir.join("scss");
        std::fs::create_dir_all(&scss_out)?;
        for e in walkdir::WalkDir::new(&styles_dir).into_iter().flatten() {
            if !e.file_type().is_file() { continue; }
            let p = e.path();
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                if ext == "scss" || ext == "sass" {
                    let src = std::fs::read_to_string(p)?;
                    let syntax = if ext == "sass" { ekko_core::parsers::css::SassSyntax::Sass } else { ekko_core::parsers::css::SassSyntax::Scss };
                    match ekko_core::parsers::css::compile_sass(&src, syntax) {
                        Ok(css) => {

                            
                            
                            let rel = p.strip_prefix(&ws.root).unwrap_or(p).to_string_lossy().replace('\\', "/");
                            let out = scss_out.join(rel.replace(".scss", ".css").replace(".sass", ".css"));
                            if let Some(parent) = out.parent() { std::fs::create_dir_all(parent)?; }
                            let processed = ekko_core::parsers::css::transform_css(&css, true, None).map(|r| r.code).unwrap_or(css);
                            std::fs::write(&out, &processed)?;
                            sass_compiled.push((rel, out));
                        }
                        Err(e) => eprintln!("Sass error in {}: {}", p.display(), e),
                    }
                }
            }
        }
        if !sass_compiled.is_empty() {
            println!("Compiled {} Sass file(s)", sass_compiled.len());
        }
    }

    let hydrate_file = ws.root.join("_hydrate.js");
    let hydrate_src = get_hydrate_js(r#"
// HMR: WebSocket live reload
(function() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = proto + "//" + location.host + "/__ekko_hmr";
  let ws = null;
  let reconnectTimer = null;
  function connect() {
    try { ws = new WebSocket(url); } catch { return; }
    ws.onopen = () => console.log("%c[HMR] connected", "color:#6ee7b7");
    ws.onmessage = (e) => {
      if (e.data === "reload") {
        console.log("%c[HMR] rebuild detected, reloading...", "color:#a78bfa;font-weight:bold");
        location.reload();
      }
    };
    ws.onclose = () => {
      ws = null;
      if (!reconnectTimer) reconnectTimer = setInterval(() => {
        try {
          const probe = new WebSocket(url);
          probe.onopen = () => { probe.close(); clearInterval(reconnectTimer); reconnectTimer = null; location.reload(); };
          probe.onerror = () => probe.close();
        } catch {}
      }, 1000);
    };
  }
  connect();
})();
"#);
    std::fs::write(&hydrate_file, hydrate_src)?;

    let mimir_client_file = ws.root.join("__mimir.js");
    let mimir_client_src = get_mimir_client_js();
    std::fs::write(&mimir_client_file, mimir_client_src)?;

    let router_client_file = ws.root.join("__router.js");
    let router_client_src = get_router_client_js();
    std::fs::write(&router_client_file, router_client_src)?;

    let jsx_client_file = ws.root.join("__jsx.js");
    std::fs::write(&jsx_client_file, get_jsx_client_js())?;

    let mut ssr_originals: Vec<(String, String)> = Vec::new();
    for entry in &entries {
        let content = std::fs::read_to_string(entry).unwrap_or_default();
        if content.contains("/* START SSR */") {
            let stripped = strip_ssr_blocks(&content);
            if stripped.contains("export function ssr") || stripped.contains("export const ssr") {
                eprintln!("  [WARN] {} has ssr() outside /* START SSR */ markers", entry);
            }
            ssr_originals.push((entry.clone(), content));
            std::fs::write(entry, &stripped).ok();
        }
    }
    
    let mut css_originals = rewrite_css_imports_in_tree(&ws.root);
    
    css_originals.extend(rewrite_css_module_imports_in_tree(ws));

    let mut cmd = std::process::Command::new(&esbuild);
    cmd.arg(hydrate_file.to_string_lossy().as_ref());
    for entry in &entries { cmd.arg(entry); }

    
    let store = ekko_core::packages::store::store_root();
    let mut spec_files: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for (name, dep) in &ws.dependencies {
        let dep_dir = store.join(name).join(&dep.version);
        for (subpath, file) in &dep.exports {
            let spec = if subpath == "." { name.clone() }
                else { format!("{}/{}", name, subpath.trim_start_matches("./")) };
            let file_path = dep_dir.join(file).display().to_string();
            cmd.arg(format!("--alias:{}={}", spec, file_path));
            spec_files.insert(spec, file_path);
        }
    }

    for (from, to) in &ws.import_overrides {
        let mut target = to.clone();
        let mut seen = std::collections::HashSet::new();
        while let Some(next) = ws.import_overrides.get(&target) {
            if !seen.insert(target.clone()) { break; }
            target = next.clone();
        }
        if let Some(file_path) = spec_files.get(&target) {
            cmd.arg(format!("--alias:{}={}", from, file_path));
        }
    }

    cmd.arg(format!("--alias:ekko:rune/mimir={}", mimir_client_file.display()));
    cmd.arg(format!("--alias:ekko:rune/router={}", router_client_file.display()));

    cmd.arg(format!("--alias:ekko:jsx-runtime={}", jsx_client_file.display()));
    cmd.arg(format!("--alias:ekko/jsx-runtime={}", jsx_client_file.display()));

    let metafile_path = build_dir.join("meta.json");
    cmd.args([
        "--bundle", "--format=esm", "--platform=browser",
        "--splitting", "--chunk-names=chunks/[name]-[hash]",
        "--entry-names=[dir]/[name]-[hash]",
        &format!("--outdir={}", out_dir.display()),
        &format!("--metafile={}", metafile_path.display()),
        "--external:ekko:*",
        "--define:process.env.NODE_ENV=\"production\"",
        "--jsx=automatic",
        "--jsx-import-source=ekko",   
        "--target=es2022,chrome90,firefox90,safari15",
    ]);

    
    
    let mut copied_css: Vec<(PathBuf, bool)> = Vec::new();
    for (src_rel, compiled_path) in &sass_compiled {
        let css_rel = src_rel.replace(".scss", ".css").replace(".sass", ".css");
        let dst = ws.root.join(&css_rel);
        let pre_existed = dst.exists();
        let _ = std::fs::copy(compiled_path, &dst);
        copied_css.push((dst, pre_existed));
    }

    let output = cmd.output()?;
    let _ = std::fs::remove_file(&hydrate_file);
    let _ = std::fs::remove_file(&mimir_client_file);
    let _ = std::fs::remove_file(&router_client_file);
    let _ = std::fs::remove_file(&jsx_client_file);

    
    for (dst, pre_existed) in &copied_css { if !pre_existed { let _ = std::fs::remove_file(dst); } }

    restore_files(&css_originals);
    for (path, original) in &ssr_originals {
        let _ = std::fs::write(path, original);
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("esbuild failed:\n{}", stderr);
    }

    let mut manifest = serde_json::json!({ "hydrate": null, "pages": {}, "chunks": [], "styles": [] });
    if metafile_path.exists() {
        let meta_str = std::fs::read_to_string(&metafile_path)?;
        if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
            if let Some(outputs) = meta["outputs"].as_object() {
                let out_abs = out_dir.to_string_lossy().replace('\\', "/");
                let out_rel = ".ekko/build/client";
                let strip_prefix = |p: &str| -> String {
                    let norm = p.replace('\\', "/");
                    norm.strip_prefix(&format!("{}/", out_abs))
                        .or_else(|| norm.strip_prefix(&format!("{}/", out_rel)))
                        .unwrap_or(&norm).to_string()
                };
                let mut chunk_set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
                let mut style_set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
                for (output_path, info) in outputs {
                    let rel = strip_prefix(output_path);
                    if rel.ends_with(".css") { style_set.insert(rel); continue; }
                    if let Some(entry_point) = info["entryPoint"].as_str() {
                        let imports: Vec<String> = info["imports"].as_array()
                            .map(|arr| arr.iter().filter_map(|imp| imp["path"].as_str()).map(|p| strip_prefix(p)).collect())
                            .unwrap_or_default();
                        let css_imports: Vec<String> = imports.iter().filter(|p| p.ends_with(".css")).cloned().collect();
                        let js_imports: Vec<String> = imports.iter().filter(|p| !p.ends_with(".css")).cloned().collect();
                        for imp in &js_imports { chunk_set.insert(imp.clone()); }
                        let ep = entry_point.replace('\\', "/");
                        if ep.contains("_hydrate") {
                            manifest["hydrate"] = serde_json::json!(rel);
                        } else {
                            let page_name = std::path::Path::new(&ep).file_name().unwrap_or_default().to_string_lossy().to_string();
                            manifest["pages"][&page_name] = serde_json::json!({"file": rel, "imports": js_imports, "css": css_imports});
                        }
                    }
                }
                manifest["chunks"] = serde_json::json!(chunk_set.into_iter().collect::<Vec<_>>());
                manifest["styles"] = serde_json::json!(style_set.into_iter().collect::<Vec<_>>());
            }
        }
    }

    let mut route_entries: Vec<serde_json::Value> = Vec::new();
    if let Some(pages) = manifest["pages"].as_object() {
        for page_key in pages.keys() {
            if is_convention_file(page_key) { continue; }
            if page_key.contains(".test.") { continue; }
            let pattern = page_key_to_route(page_key);
            let is_catch_all = pattern.contains('*');
            let is_dynamic = pattern.contains(':');
            let priority = if is_catch_all { 2 } else if is_dynamic { 1 } else { 0 };
            route_entries.push(serde_json::json!({
                "pattern": pattern,
                "page": page_key,
                "priority": priority,
            }));
        }
        route_entries.sort_by(|a, b| {
            let pa = a["priority"].as_i64().unwrap_or(0);
            let pb = b["priority"].as_i64().unwrap_or(0);
            pa.cmp(&pb).then_with(|| {
                a["pattern"].as_str().unwrap_or("").cmp(b["pattern"].as_str().unwrap_or(""))
            })
        });
    }
    manifest["routes"] = serde_json::json!(route_entries);

    let manifest_path = build_dir.join("manifest.json");
    std::fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?)?;

    let hmr_path = out_dir.join("__hmr");
    let build_id = format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis());
    std::fs::write(&hmr_path, &build_id)?;

    let mut touched: Vec<PathBuf> = vec![hydrate_file, mimir_client_file, router_client_file, jsx_client_file];
    touched.extend(copied_css.into_iter().map(|(p, _)| p));
    touched.extend(css_originals.iter().map(|(p, _)| p.clone()));
    touched.extend(ssr_originals.iter().map(|(p, _)| PathBuf::from(p)));
    Ok(touched)
}

fn start_dev_server(file: &std::path::Path, port: Option<&str>, allow: &[String]) -> anyhow::Result<std::process::Child> {
    let exe = std::env::current_exe()?;
    let mut cmd = std::process::Command::new(&exe);
    cmd.arg("run");
    
    if !allow.is_empty() {
        cmd.arg(format!("--allow={}", allow.join(",")));
    }
    cmd.arg(file);
    if let Some(p) = port {
        cmd.env("PORT", p);
    }
    Ok(cmd.spawn()?)
}

fn get_mimir_client_js() -> &'static str {
    include_str!("client/mimir.js")
}

fn get_router_client_js() -> &'static str {
    include_str!("client/router.js")
}

fn get_jsx_client_js() -> &'static str {
    include_str!("client/jsx.js")
}

fn get_hydrate_js(suffix: &str) -> String {
    format!(r##"import {{ createRoot, hydrateRoot }} from "@ekko/react-dom/client";
import {{ createElement }} from "@ekko/react";
import {{ mimir }} from "ekko:rune/mimir";

// Link is a real export of ekko:rune/router (no global) — apps import it. No window.Link here.

const dataEl = document.getElementById("__EKKO_DATA__");
const data = dataEl ? JSON.parse(dataEl.textContent || "{{}}") : {{}};
try {{
  if (data.__sessionMode) mimir.session(data.__sessionMode);
  await mimir.initStore(data.__atoms || {{}});
}} catch(e) {{
  console.error("[mimir] initStore failed:", e);
}}

const routeTable = data.__routes || [];
const routerCfg = data.__routerConfig || {{}};
const backRules = routerCfg.backRules || [];
const beforeUnloadPatterns = routerCfg.beforeUnload || [];

const container = document.getElementById("__ekko-content") || document.getElementById("__ekko");
let root = null;
let currentPage = null;
let Layout = null;
if (data.__layout) {{
  try {{ const lm = await import(data.__layout); Layout = lm.default; }} catch(e) {{ console.error("[hydrate] layout import failed:", e); }}
}}

// Preload ALL page modules at startup — navigation is local, zero network
const pageModules = {{}};
const preloadPromises = [];
for (const r of routeTable) {{
  if (r.pageFile && !pageModules[r.pageFile]) {{
    preloadPromises.push(
      import(r.pageFile).then(m => {{ pageModules[r.pageFile] = m; }}).catch(() => {{}})
    );
  }}
}}
await Promise.all(preloadPromises);

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
function validateUrl(url) {{
  const qi = url.indexOf("?");
  const path = qi >= 0 ? url.slice(0, qi) : url;
  const qs = qi >= 0 ? url.slice(qi + 1) : "";
  const segs = path.split("/").filter(Boolean);
  for (let i = 0; i < segs.length; i++) {{
    if (!SAFE_SEGMENT.test(segs[i])) return false;
  }}
  if (qs) {{
    if (/&&/.test(qs) || qs[0] === "&" || qs[qs.length - 1] === "&") return false;
    const pairs = qs.split("&");
    for (let i = 0; i < pairs.length; i++) {{
      const eq = pairs[i].indexOf("=");
      if (eq < 0) return false;
      const k = pairs[i].slice(0, eq);
      const v = pairs[i].slice(eq + 1);
      if (!k || !SAFE_SEGMENT.test(k)) return false;
      if (v && !SAFE_SEGMENT.test(v)) return false;
    }}
  }}
  return true;
}}

function matchPath(pattern, actual) {{
  if (pattern === actual) return true;
  const pp = pattern.split("/").filter(Boolean);
  const ap = actual.split("/").filter(Boolean);
  for (let i = 0; i < pp.length; i++) {{
    if (pp[i][0] === "*") return ap.length >= i + 1;
    if (i >= ap.length) return false;
    if (pp[i][0] !== ":" && pp[i][0] !== "{{" && pp[i] !== ap[i]) return false;
  }}
  return pp.length === ap.length;
}}

function extractParams(pattern, actual) {{
  const pp = pattern.split("/").filter(Boolean);
  const ap = actual.split("/").filter(Boolean);
  const p = {{}};
  for (let i = 0; i < pp.length; i++) {{
    if (pp[i][0] === "*") {{ p[pp[i].slice(1)] = ap.slice(i); break; }}
    if (pp[i][0] === ":") p[pp[i].slice(1)] = ap[i] || "";
  }}
  return p;
}}

function parseQuery(s) {{
  const q = {{}};
  if (!s) return q;
  if (s[0] === "?") s = s.slice(1);
  if (!s) return q;
  const pairs = s.split("&");
  for (let i = 0; i < pairs.length; i++) {{
    const eq = pairs[i].indexOf("=");
    if (eq >= 0) {{ const k = pairs[i].slice(0, eq); if (k) q[k] = pairs[i].slice(eq + 1); }}
  }}
  return q;
}}

function matchRoute(path) {{
  for (let i = 0; i < routeTable.length; i++) {{
    const r = routeTable[i];
    if (matchPath(r.pattern, path)) {{
      return {{ ...r, params: extractParams(r.pattern, path) }};
    }}
  }}
  return null;
}}

let _firstRender = true;
async function renderPage(pageUrl, props) {{
  if (!container || !pageUrl) return;
  const mod = pageModules[pageUrl] || await import(pageUrl).catch(() => null);
  if (!mod) return;
  if (!pageModules[pageUrl]) pageModules[pageUrl] = mod;
  const Page = mod.default;
  currentPage = pageUrl;
  const page = createElement(Page, props || {{}});
  const tree = Layout ? createElement(Layout, {{ children: page }}) : page;
  if (_firstRender && container.childNodes.length > 0) {{
    root = hydrateRoot(container, tree, {{ onRecoverableError: () => {{}} }});
    _firstRender = false;
  }} else {{
    if (!root) root = createRoot(container);
    root.render(tree);
    _firstRender = false;
  }}
}}

let _currentParams = {{}};

async function navigate(href, opts) {{
  opts = opts || {{}};
  const pathOnly = href.split("?")[0];
  if (!validateUrl(href)) {{ console.error("[router] Invalid URL:", href); return; }}
  const matched = matchRoute(pathOnly);
  if (!matched) {{ window.location.href = href; return; }}
  if (matched.guard && matched.guard.redirect) {{
    // Guard check deferred to page component
  }}
  const pageUrl = matched.pageFile;
  if (!pageUrl) {{ window.location.href = href; return; }}
  _currentParams = matched.params;
  if (window.__ekko_router_set_params) window.__ekko_router_set_params(matched.params);
  await renderPage(pageUrl, {{ params: matched.params, query: parseQuery(href.split("?")[1] || ""), path: pathOnly }});
  if (opts.replace) history.replaceState({{ page: pageUrl, params: matched.params, href }}, "", href);
  else history.pushState({{ page: pageUrl, params: matched.params, href }}, "", href);
  if (window.__ekko_router_notify) window.__ekko_router_notify();
}}

window.__ekko_navigate = navigate;
window.__ekko_router_params = _currentParams;

if (data.__user) {{ mimir.hydrate({{ auth: data.__user }}); if (data.__user.rbac) mimir.hydrate({{ rbac: data.__user.rbac }}); }}
if (data.page) await renderPage(data.page, data.props || {{}});

document.addEventListener("click", (e) => {{
  const link = e.target.closest("a[data-nav]");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#")
      || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(href);
}});

window.addEventListener("popstate", async (e) => {{
  const path = location.pathname;
  for (let i = 0; i < backRules.length; i++) {{
    const rule = backRules[i];
    let matches = false;
    if (rule.matchType === "regex" && rule.match) matches = new RegExp(rule.match).test(path);
    else if (rule.matchType === "string" && rule.match) matches = path.startsWith(rule.match);
    if (matches) {{
      if (rule.goTo) {{ navigate(rule.goTo, {{ replace: true }}); return; }}
      if (rule.skip) {{ history.go(-(rule.skip - 1)); return; }}
    }}
  }}
  if (e.state && e.state.page) {{
    _currentParams = e.state.params || {{}};
    if (window.__ekko_router_set_params) window.__ekko_router_set_params(_currentParams);
    await renderPage(e.state.page, {{ params: _currentParams, query: parseQuery(location.search), path }});
    if (window.__ekko_router_notify) window.__ekko_router_notify();
  }} else {{
    const matched = matchRoute(path);
    if (matched && matched.pageFile) {{
      _currentParams = matched.params;
      if (window.__ekko_router_set_params) window.__ekko_router_set_params(_currentParams);
      await renderPage(matched.pageFile, {{ params: matched.params, query: parseQuery(location.search), path }});
      if (window.__ekko_router_notify) window.__ekko_router_notify();
    }} else {{
      window.location.reload();
    }}
  }}
}});

if (beforeUnloadPatterns.length > 0) {{
  window.addEventListener("beforeunload", (e) => {{
    const current = location.pathname;
    const active = beforeUnloadPatterns.some((p) => {{
      if (p.endsWith("/*")) return current.startsWith(p.slice(0, -1));
      if (p === "*") return true;
      return current === p;
    }});
    if (!active) return;
    e.preventDefault();
    e.returnValue = "";
  }});
}}

const prefetched = new Set();
document.addEventListener("mouseover", (e) => {{
  const link = e.target.closest("a[data-nav]");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || prefetched.has(href)) return;
  const path = href.split("?")[0];
  const matched = matchRoute(path);
  if (!matched || !matched.pageFile) return;
  prefetched.add(href);
  const l = document.createElement("link");
  l.rel = "modulepreload";
  l.href = matched.pageFile;
  document.head.appendChild(l);
}});
{}"##, suffix)
}

fn strip_ssr_blocks(source: &str) -> String {
    let mut result = String::with_capacity(source.len());
    let mut in_ssr = false;
    for line in source.lines() {
        if line.contains("/* START SSR */") { in_ssr = true; continue; }
        if line.contains("/* END SSR */") { in_ssr = false; continue; }
        if !in_ssr { result.push_str(line); result.push('\n'); }
    }
    result
}

fn is_convention_file(page_key: &str) -> bool {
    let basename = page_key.rsplit('/').next().unwrap_or(page_key);
    let name = if let Some(pos) = basename.rfind('.') { &basename[..pos] } else { basename };
    matches!(name, "layout" | "_layout" | "error" | "_error" | "loading" | "not-found" | "route")
}

fn page_key_to_route(page_key: &str) -> String {
    let mut route = page_key.to_string();
    
    for ext in &[".tsx", ".jsx", ".ts", ".js"] {
        if route.ends_with(ext) {
            route = route[..route.len() - ext.len()].to_string();
            break;
        }
    }
    
    while let Some(start) = route.find('(') {
        if let Some(end) = route[start..].find(')') {
            let real_end = start + end + 1;
            if real_end < route.len() && route.as_bytes()[real_end] == b'/' {
                route = format!("{}{}", &route[..start], &route[real_end + 1..]);
            } else {
                route = format!("{}{}", &route[..start], &route[real_end..]);
            }
        } else {
            break;
        }
    }
    
    while let Some(start) = route.find("[...") {
        if let Some(end) = route[start..].find(']') {
            let param = &route[start + 4..start + end];
            route = format!("{}*{}{}", &route[..start], param, &route[start + end + 1..]);
        } else {
            break;
        }
    }
    
    while let Some(start) = route.find('[') {
        if let Some(end) = route[start..].find(']') {
            let param = &route[start + 1..start + end];
            route = format!("{}:{}{}", &route[..start], param, &route[start + end + 1..]);
        } else {
            break;
        }
    }
    
    if route == "index" || route.ends_with("/index") {
        let prefix = &route[..route.len().saturating_sub(5)];
        route = if prefix.is_empty() { "/".to_string() } else { prefix.to_string() };
    }
    
    if !route.starts_with('/') {
        route = format!("/{}", route);
    }
    
    if route.len() > 1 && route.ends_with('/') {
        route.pop();
    }
    route
}

fn apply_workspace_permissions_from_dir(project_dir: &std::path::Path) {
    let config = project_dir.join("ekko.json");
    ekko_core::packages::workspace::init_workspace(&config);
    
    let perms = ekko_core::packages::workspace::get_workspace()
        .and_then(|ws| ws.permissions.as_ref())
        .map(ekko_core::ffi::ffi_runtime::PermissionSet::from_json)
        .unwrap_or_else(ekko_core::ffi::ffi_runtime::PermissionSet::new);
    ekko_core::engine::v8_runtime::set_permissions(perms);
}

enum RunSource {
    
    DiskFile(PathBuf),
    
    VfsFile { package: String, path: String },
}

enum RunTarget {

    Module(RunSource),
    
    Gui { package: Option<String>, path: Option<PathBuf>, ekl: Option<PathBuf> },
    
    Tui { package: Option<String>, path: Option<PathBuf>, ekl: Option<PathBuf> },
    
    Test { root: PathBuf },
    
    Lib(String),
}

fn dispatch_run(
    file: Option<PathBuf>, path: Option<PathBuf>, ekl: Option<PathBuf>,
    root: Option<PathBuf>, allow: Vec<String>, _script_args: Vec<String>,
) -> anyhow::Result<()> {
    let target = match resolve_run_target(file.as_deref(), path.as_deref(), ekl.as_deref()) {
        Ok(t) => t,
        Err(e) => { eprintln!("error: {}", e); std::process::exit(1); }
    };
    match target {
        
        RunTarget::Gui { package, path, ekl } => handle_gui_command(GuiCommands::Run { package, path, ekl }),
        RunTarget::Tui { package, path, ekl } => handle_tui_command(TuiCommands::Run { package, path, ekl }),
        RunTarget::Lib(name) => {
            eprintln!("error: '{}' is a library — libraries are imported, not run", name);
            std::process::exit(1);
        }
        RunTarget::Test { root: test_root } => {
            let rt = build_runtime()?;
            rt.block_on(async move {
                let mut files: Vec<PathBuf> = Vec::new();
                for pat in ["**/*.test.ts", "**/*.test.js"] {
                    if let Ok(paths) = glob::glob(&format!("{}/{}", test_root.display(), pat)) {
                        files.extend(paths.flatten());
                    }
                }
                if files.is_empty() {
                    println!("no test files (*.test.ts / *.test.js) found in {}", test_root.display());
                    return Ok(());
                }
                run_command(Commands::Test { files, coverage: false, include: vec![], exclude: vec![], ekl_files: vec![] }).await
            })
        }
        RunTarget::Module(source) => { let rt = build_runtime()?; rt.block_on(run_module(source, ekl, root, allow)) }
    }
}

fn run_permissions_json(source: &RunSource) -> Option<serde_json::Value> {
    let ws = ekko_core::packages::workspace::get_workspace()?;
    if let RunSource::DiskFile(p) = source {
        let abs = std::fs::canonicalize(p).unwrap_or_else(|_| p.clone());
        if let Some(m) = ws.member_owning_path(&abs.to_string_lossy()) {
            if m.permissions.is_some() { return m.permissions.clone(); }
        }
    }
    ws.permissions.clone()
}

async fn run_module(
    source: RunSource, ekl: Option<PathBuf>, root: Option<PathBuf>, allow: Vec<String>,
) -> anyhow::Result<()> {

    if root.is_some() && !root_flag_allowed(&source) {
        eprintln!("error: --root only applies to a store package or `--ekl <file>` run; a project/workspace run uses its own directory");
        std::process::exit(1);
    }
    ekko_core::engine::v8_runtime::set_app_root(compute_app_root(&source, ekl.as_deref(), root.as_deref()));

    let perms = if !allow.is_empty() {
        ekko_core::ffi::ffi_runtime::PermissionSet::from_flags(&allow)
    } else if let Some(perm_json) = run_permissions_json(&source) {
        ekko_core::ffi::ffi_runtime::PermissionSet::from_json(&perm_json)
    } else {
        ekko_core::ffi::ffi_runtime::PermissionSet::new()
    };
    ekko_core::engine::v8_runtime::set_permissions(perms);
    match source {
        RunSource::DiskFile(p) => run_file(&p).await,
        RunSource::VfsFile { package, path } => {
            let src = ekko_core::module_loader::vfs_registry()
                .read_module(&package, &path)
                .ok_or_else(|| anyhow::anyhow!("'{}' not found in archive", path))?;
            let display = format!("ekl:///{}/{}", package, path);
            if let Err(e) = ekko_core::engine::v8_runtime::execute_module_async(&src, &display).await {
                eprintln!("error: {}", e);
                std::process::exit(1);
            }
            Ok(())
        }
    }
}

fn resolve_run_target(
    file: Option<&std::path::Path>,
    path: Option<&std::path::Path>,
    ekl: Option<&std::path::Path>,
) -> anyhow::Result<RunTarget> {
    use ekko_core::packages::workspace::{self, MemberKind};

    if let Some(archive) = ekl {
        if !archive.exists() { anyhow::bail!("archive not found: {}", archive.display()); }
        let pkg = ekko_vfs::EklPackage::from_file(archive)
            .map_err(|e| anyhow::anyhow!("failed to load .ekl: {}", e))?;
        let name = pkg.metadata.name.clone();

        if let Some(f) = file {
            ekko_core::module_loader::vfs_registry().load_package_from_bytes(std::fs::read(archive)?)?;
            init_ekl_workspace(&name);
            let rel = resolve_vfs_path(&name, &f.to_string_lossy())
                .ok_or_else(|| anyhow::anyhow!("'{}' not found in {}", f.display(), archive.display()))?;
            return Ok(RunTarget::Module(RunSource::VfsFile { package: name, path: rel }));
        }

        match pkg.metadata.project_type.as_deref() {
            Some("gui") => return Ok(RunTarget::Gui { package: None, path: None, ekl: Some(archive.to_path_buf()) }),
            Some("tui") => return Ok(RunTarget::Tui { package: None, path: None, ekl: Some(archive.to_path_buf()) }),
            Some("lib") => return Ok(RunTarget::Lib(name)),
            Some("test") => anyhow::bail!("'{}' is a test package — run tests with `ekko test`", name),
            Some("tool") => {
                ekko_core::module_loader::vfs_registry().load_package_from_bytes(std::fs::read(archive)?)?;
                init_ekl_workspace(&name);
                let bin_entry = pkg.metadata.bin.values().next()
                    .ok_or_else(|| anyhow::anyhow!("package '{}' has no bin entries", name))?
                    .clone();
                let entry_raw = bin_entry.trim_start_matches("./");
                let entry_file = if ekko_core::module_loader::vfs_registry().read_module(&name, entry_raw).is_some() {
                    entry_raw.to_string()
                } else {
                    entry_raw.replace(".tsx", ".js").replace(".ts", ".js")
                };
                return Ok(RunTarget::Module(RunSource::VfsFile { package: name, path: entry_file }));
            }
            _ => { 
                ekko_core::module_loader::vfs_registry().load_package_from_bytes(std::fs::read(archive)?)?;
                init_ekl_workspace(&name);
                let entry = pkg.metadata.entry.clone()
                    .ok_or_else(|| anyhow::anyhow!("'{}' has no entry point", name))?;
                return Ok(RunTarget::Module(RunSource::VfsFile { package: name, path: entry }));
            }
        }
    }

    let root = match path {
        Some(p) => p.to_path_buf(),
        None => std::env::current_dir()?,
    };

    if let Some(f) = file {
        if f.extension().map_or(false, |e| e == "ekl") {
            anyhow::bail!("'{}' is a packaged archive — mount it with: ekko run --ekl {}", f.display(), f.display());
        }
        let target = if f.is_absolute() { f.to_path_buf() } else { root.join(f) };
        if target.is_dir() {
            anyhow::bail!("'{}' is a directory — run a project folder with: ekko run -p {}", target.display(), target.display());
        }
        
        if let Some(resolved) = resolve_disk_file(&target) {
            let abs = std::fs::canonicalize(&resolved).unwrap_or_else(|_| resolved.clone());
            workspace::init_workspace(&abs);
            return Ok(RunTarget::Module(RunSource::DiskFile(resolved)));
        }
        
        let name = f.to_string_lossy();
        
        let clean = !name.split(|c| c == '/' || c == '\\').any(|s| s == "." || s == "..");
        let is_scoped = name.starts_with('@') && name.matches('/').count() == 1 && !name.contains('\\') && clean;
        let is_bare = !name.starts_with('.') && !name.contains('/') && !name.contains('\\') && clean;
        if path.is_none() && (is_scoped || is_bare) {
            
            if let Some(t) = resolve_store_target(&name)? {
                return Ok(t);
            }
            
            if let Some(bin) = resolve_bin_name(&name) {
                return Ok(RunTarget::Module(RunSource::DiskFile(bin)));
            }
        }
        anyhow::bail!("'{}' not found: not a file (tried .ts/.tsx/.js/.jsx/.mjs), a store package, or a known command", target.display());
    }

    let config = root.join("ekko.json");
    if !config.exists() {
        anyhow::bail!("no ekko.json in '{}' — pass a file to run, or run inside a project folder", root.display());
    }
    workspace::init_workspace(&config); 
    let ws = workspace::get_workspace()
        .ok_or_else(|| anyhow::anyhow!("invalid ekko.json in '{}'", root.display()))?;
    let abs_root = std::fs::canonicalize(&root).unwrap_or_else(|_| root.clone());
    let m = find_member_by_cwd(ws, &abs_root)
        .or_else(|| ws.members.values().next())
        .ok_or_else(|| anyhow::anyhow!("'{}' contains no project", root.display()))?;
    match m.kind {
        MemberKind::Run => {
            let e = m.entry.as_deref().ok_or_else(|| anyhow::anyhow!(
                "project '{}' is type \"run\" but declares no \"entry\" in ekko.json", m.name))?;
            Ok(RunTarget::Module(RunSource::DiskFile(m.root_dir.join(e))))
        }
        MemberKind::Gui => Ok(RunTarget::Gui { package: None, path: path.map(|p| p.to_path_buf()), ekl: None }),
        MemberKind::Tui => Ok(RunTarget::Tui { package: None, path: path.map(|p| p.to_path_buf()), ekl: None }),
        MemberKind::Tool => {
            let (_, bin) = m.bin.iter().next()
                .ok_or_else(|| anyhow::anyhow!("tool '{}' declares no \"bin\" in ekko.json", m.name))?;
            Ok(RunTarget::Module(RunSource::DiskFile(m.root_dir.join(bin))))
        }
        MemberKind::Test => Ok(RunTarget::Test { root: m.root_dir.clone() }),
        MemberKind::Lib => Ok(RunTarget::Lib(m.name.clone())),
    }
}

fn resolve_store_target(name: &str) -> anyhow::Result<Option<RunTarget>> {
    use ekko_core::packages::workspace;
    let store_path = ekko_core::packages::store::store_path();
    let base = store_path.join(name);
    if !base.is_dir() { return Ok(None); }
    
    if let (Ok(store_abs), Ok(base_abs)) = (std::fs::canonicalize(&store_path), std::fs::canonicalize(&base)) {
        if !base_abs.starts_with(&store_abs) { return Ok(None); }
    }
    fn ver_key(v: &str) -> (u64, u64, u64) {
        let mut it = v.split('.').map(|s| s.split('-').next().unwrap_or("0").parse::<u64>().unwrap_or(0));
        (it.next().unwrap_or(0), it.next().unwrap_or(0), it.next().unwrap_or(0))
    }
    let mut versions: Vec<String> = std::fs::read_dir(&base).ok().into_iter().flatten()
        .flatten()
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    versions.sort_by_key(|v| ver_key(v));
    let version = match versions.last() { Some(v) => v.clone(), None => return Ok(None) };
    let store_dir = base.join(&version);

    
    let manifest: serde_json::Value = match std::fs::read_to_string(store_dir.join("manifest.json")).ok()
        .and_then(|s| serde_json::from_str(&s).ok()) {
        Some(m) => m,
        None => return Ok(None),
    };
    let ptype = manifest.get("project_type").and_then(|t| t.as_str()).unwrap_or("lib");
    
    let stored = |rel: &str| -> PathBuf {
        let direct = store_dir.join(rel);
        if direct.exists() { direct } else { store_dir.join(rel.replace(".tsx", ".js").replace(".ts", ".js")) }
    };
    match ptype {
        "run" => {
            let entry = manifest.get("entry").and_then(|e| e.as_str())
                .ok_or_else(|| anyhow::anyhow!("store package '{}' (run) has no entry", name))?;
            let p = stored(entry);
            
            workspace::init_workspace(&std::fs::canonicalize(&p).unwrap_or_else(|_| p.clone()));
            Ok(Some(RunTarget::Module(RunSource::DiskFile(p))))
        }
        "tool" => {
            let bin = manifest.get("bin").and_then(|b| b.as_object())
                .and_then(|o| o.values().next()).and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("store package '{}' (tool) has no bin", name))?;
            let p = stored(bin);
            workspace::init_workspace(&std::fs::canonicalize(&p).unwrap_or_else(|_| p.clone()));
            Ok(Some(RunTarget::Module(RunSource::DiskFile(p))))
        }

        "gui" => Ok(Some(RunTarget::Gui { package: Some(store_dir.to_string_lossy().into_owned()), path: None, ekl: None })),
        "tui" => Ok(Some(RunTarget::Tui { package: Some(store_dir.to_string_lossy().into_owned()), path: None, ekl: None })),
        "lib" => Ok(Some(RunTarget::Lib(name.to_string()))),
        _ => Ok(None),
    }
}

fn resolve_bin_name(name: &str) -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));
    let ws = ekko_core::packages::workspace::get_workspace();

    if let Ok(content) = std::fs::read_to_string(cwd.join("ekko.json")) {
        if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(bin_path) = pkg["bin"].get(name).and_then(|v| v.as_str()) {
                let file = cwd.join(bin_path);
                if file.exists() { return Some(file); }
            }
        }
    }
    
    if let Some(ws) = &ws {
        for member in ws.members.values() {
            if let Some(bin_path) = member.bin.get(name) {
                let file = member.root_dir.join(bin_path);
                if file.exists() { return Some(file); }
            }
        }
    }
    
    let store = ekko_core::packages::store::store_path();
    if let Some(ws) = &ws {
        if let Some(lock) = &ws.lockfile {
            for (pkg_name, pkg) in &lock.packages {
                let base = store.join(pkg_name).join(&pkg.version);
                if let Ok(content) = std::fs::read_to_string(base.join("manifest.json")) {
                    if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(bin_path) = manifest["bin"].get(name).and_then(|v| v.as_str()) {
                            let file = base.join(bin_path);
                            let file = if file.exists() { file } else {
                                base.join(bin_path.replace(".ts", ".js").replace(".tsx", ".js"))
                            };
                            if file.exists() { return Some(file); }
                        }
                    }
                }
            }
        }
    }
    
    if let Some(ws) = &ws {
        if let Some(member) = ws.members.get(name) {
            if let Some((_, bin_path)) = member.bin.iter().next() {
                let file = member.root_dir.join(bin_path);
                if file.exists() { return Some(file); }
            }
        }
    }
    None
}

fn init_ekl_workspace(package: &str) {
    let reg = ekko_core::module_loader::vfs_registry();
    let ekko_json = match reg.read_file(package, "ekko.json") { Some(d) => d, None => return };
    let safe = package.replace(['/', '@', '\\'], "_");
    let dir = std::env::temp_dir().join(format!("ekko-ekl-ws-{}-{}", std::process::id(), safe));
    if std::fs::create_dir_all(&dir).is_err() { return; }
    if std::fs::write(dir.join("ekko.json"), &ekko_json).is_err() { return; }
    if let Some(lock) = reg.read_file(package, "ekko.lock") {
        let _ = std::fs::write(dir.join("ekko.lock"), &lock);
    }
    ekko_core::packages::workspace::init_workspace(&dir.join("ekko.json"));
}

fn root_flag_allowed(source: &RunSource) -> bool {
    match source {
        RunSource::VfsFile { .. } => true,
        RunSource::DiskFile(p) => {
            let store = ekko_core::packages::store::store_root();
            let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
            std::fs::canonicalize(p).unwrap_or_else(|_| p.clone()).starts_with(&store_abs)
        }
    }
}

fn compute_app_root(
    source: &RunSource,
    ekl: Option<&std::path::Path>,
    root: Option<&std::path::Path>,
) -> ekko_core::engine::v8_runtime::AppRoot {
    use ekko_core::engine::v8_runtime::AppRoot;
    let abs = |p: &std::path::Path| std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf());
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));

    
    
    match source {
        RunSource::VfsFile { package, .. } => {

            
            let ekl_dir = ekl.map(abs).and_then(|p| p.parent().map(|d| d.to_path_buf())).unwrap_or_else(|| cwd.clone());
            let real = root.map(abs).unwrap_or(ekl_dir);
            
            let virtual_root = Some(format!("ekl:///{}", package));
            AppRoot { vfs_package: Some(package.clone()), read_root: real.clone(), write_root: real, own_reads_exempt: true, virtual_root }
        }
        RunSource::DiskFile(p) => {
            let store = ekko_core::packages::store::store_root();
            let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
            let pabs = abs(p);
            if pabs.starts_with(&store_abs) {
                let read_root = pabs.parent().map(|d| d.to_path_buf()).unwrap_or_else(|| cwd.clone());
                let write_root = root.map(abs).unwrap_or_else(|| cwd.clone());

                
                let virtual_root = read_root.strip_prefix(&store_abs).ok()
                    .map(|rel| format!("store:///{}", rel.to_string_lossy().replace('\\', "/")));
                AppRoot { vfs_package: None, read_root, write_root, own_reads_exempt: true, virtual_root }
            } else {
                
                AppRoot { vfs_package: None, read_root: cwd.clone(), write_root: cwd, own_reads_exempt: false, virtual_root: None }
            }
        }
    }
}

fn resolve_disk_file(target: &std::path::Path) -> Option<PathBuf> {
    if target.exists() && !target.is_dir() {
        return Some(target.to_path_buf());
    }
    if target.extension().is_none() {
        for ext in ["ts", "tsx", "js", "jsx", "mjs"] {
            let mut s = target.as_os_str().to_owned();
            s.push(".");
            s.push(ext);
            let cand = PathBuf::from(s);
            if cand.exists() {
                return Some(cand);
            }
        }
    }
    None
}

fn resolve_vfs_path(package: &str, rel: &str) -> Option<String> {
    let reg = ekko_core::module_loader::vfs_registry();
    let js = |p: &str| p.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js");
    
    for c in [rel.to_string(), js(rel)] {
        if reg.read_module(package, &c).is_some() {
            return Some(c);
        }
    }
    
    if std::path::Path::new(rel).extension().is_none() {
        for ext in ["ts", "tsx", "js", "jsx", "mjs"] {
            let p = format!("{}.{}", rel, ext);
            for c in [p.clone(), js(&p)] {
                if reg.read_module(package, &c).is_some() {
                    return Some(c);
                }
            }
        }
    }
    None
}

async fn run_file(file: &PathBuf) -> anyhow::Result<()> {
    if !file.exists() {
        anyhow::bail!("file not found: {}", file.display());
    }

    let source = std::fs::read_to_string(file)?;
    let filename = file.to_string_lossy().to_string();

    let code = if ekko_core::parsers::swc_transform::needs_transpile(&filename) {
        ekko_core::parsers::swc_transform::transpile(&source, &filename)?
    } else {
        source
    };

    if let Err(e) = ekko_core::engine::v8_runtime::execute_module_async(&code, &filename).await {
        eprintln!("error: {}", e);
        std::process::exit(1);
    }
    Ok(())
}

fn discover_ts_files(dir: &std::path::Path) -> Vec<PathBuf> {
    let mut results = Vec::new();
    let walker = walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "vendor" && name != "_build_out" && name != "target"
        });
    for entry in walker.flatten() {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "ts" || ext == "tsx" {
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    if !name.ends_with(".test.ts") && !name.ends_with(".test.tsx") {
                        results.push(path.to_path_buf());
                    }
                }
            }
        }
    }
    results
}

fn run_gui_from_ekl(ekl_path: &std::path::Path) -> anyhow::Result<()> {
    let pkg = ekko_vfs::EklPackage::from_file(ekl_path)
        .map_err(|e| anyhow::anyhow!("failed to load .ekl: {}", e))?;
    let entry = pkg.metadata.entry.as_deref()
        .ok_or_else(|| anyhow::anyhow!("no entry in .ekl metadata, package type {:?}", pkg.metadata.project_type))?;
    ekko_core::module_loader::vfs_registry()
        .load_package_from_bytes(std::fs::read(ekl_path)?)?;
    let source = ekko_core::module_loader::vfs_registry()
        .read_module(&pkg.metadata.name, entry)
        .ok_or_else(|| anyhow::anyhow!("entry '{}' not found in .ekl", entry))?;
    let title = pkg.metadata.name.clone();
    let display = format!("ekl:///{}/{}", pkg.metadata.name, entry);
    ekko_gui::run_from_vfs((*source).clone(), display, title, pkg.metadata.name.clone())
}

fn run_tui_from_ekl(ekl_path: &std::path::Path) -> anyhow::Result<()> {
    let pkg = ekko_vfs::EklPackage::from_file(ekl_path)
        .map_err(|e| anyhow::anyhow!("failed to load .ekl: {}", e))?;
    let entry = pkg.metadata.entry.as_deref()
        .ok_or_else(|| anyhow::anyhow!("no entry in .ekl metadata, package type {:?}", pkg.metadata.project_type))?;
    ekko_core::module_loader::vfs_registry()
        .load_package_from_bytes(std::fs::read(ekl_path)?)?;
    let source = ekko_core::module_loader::vfs_registry()
        .read_module(&pkg.metadata.name, entry)
        .ok_or_else(|| anyhow::anyhow!("entry '{}' not found in .ekl", entry))?;
    let title = pkg.metadata.name.clone();
    let display = format!("ekl:///{}/{}", pkg.metadata.name, entry);
    ekko_tui::run_from_vfs((*source).clone(), display, title)
}

fn resolve_store_package(
    name: &str,
    expected_type: &str,
) -> anyhow::Result<(PathBuf, String, String)> {
    let cwd = std::env::current_dir().unwrap_or_default();
    ekko_core::packages::workspace::init_workspace(&cwd.join("ekko.json"));

    let ws = ekko_core::packages::workspace::get_workspace();
    let version = ws.and_then(|ws| {
        ws.lockfile.as_ref()?.packages.get(name).map(|p| p.version.clone())
    }).ok_or_else(|| anyhow::anyhow!(
        "package '{}' not found in lockfile. Run: ekko add {}", name, name
    ))?;

    let store = ekko_core::packages::store::store_path();
    let store_dir = store.join(name).join(&version);
    let manifest_path = store_dir.join("manifest.json");
    let manifest: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(&manifest_path)
            .map_err(|_| anyhow::anyhow!("package '{}@{}' not in store. Run: ekko add {}", name, version, name))?
    )?;

    let pkg_type = manifest["project_type"].as_str().unwrap_or("lib");
    if pkg_type != expected_type {
        anyhow::bail!("package '{}' is type '{}', expected '{}'", name, pkg_type, expected_type);
    }

    let entry = manifest["entry"].as_str()
        .ok_or_else(|| anyhow::anyhow!("package '{}' has no entry point", name))?;
    let entry_path = store_dir.join(entry);
    let entry_path = if entry_path.exists() { entry.to_string() } else {
        let js = entry.replace(".ts", ".js").replace(".tsx", ".js");
        js
    };

    let title = manifest["name"].as_str().unwrap_or(name).to_string();
    Ok((store_dir, entry_path, title))
}

#[cfg(test)]
mod run_resolution_tests {
    use super::*;

    fn argv(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn normalize_inserts_run_for_a_path() {
        assert_eq!(normalize_run_argv(argv(&["ekko", "app.ts"])), argv(&["ekko", "run", "app.ts"]));
        assert_eq!(
            normalize_run_argv(argv(&["ekko", "src/app", "--ekl", "a.ekl"])),
            argv(&["ekko", "run", "src/app", "--ekl", "a.ekl"])
        );
    }

    #[test]
    fn normalize_leaves_subcommands_flags_and_bare_untouched() {
        assert_eq!(normalize_run_argv(argv(&["ekko", "run", "app.ts"])), argv(&["ekko", "run", "app.ts"]));
        assert_eq!(normalize_run_argv(argv(&["ekko", "test"])), argv(&["ekko", "test"]));
        assert_eq!(normalize_run_argv(argv(&["ekko", "ekl", "ls"])), argv(&["ekko", "ekl", "ls"]));
        
        assert_eq!(normalize_run_argv(argv(&["ekko", "gui"])), argv(&["ekko", "run", "gui"]));
        assert_eq!(normalize_run_argv(argv(&["ekko", "--version"])), argv(&["ekko", "--version"]));
        assert_eq!(normalize_run_argv(argv(&["ekko"])), argv(&["ekko"]));
    }

    #[test]
    fn normalize_subs_covers_every_clap_subcommand() {
        use clap::CommandFactory;
        const SUBS: &[&str] = &[
            "run", "eval", "repl", "test", "build", "pack", "add", "remove", "publish", "update", "vendor",
            "audit", "login", "search", "list", "check", "dev", "x", "init", "gui", "tui", "ekl", "img", "auth", "help", "doc",
        ];
        let cmd = Cli::command();
        for sc in cmd.get_subcommands() {
            let name = sc.get_name();
            assert!(SUBS.contains(&name), "normalize_run_argv SUBS is missing clap subcommand '{}'", name);
        }
    }

    #[test]
    fn resolve_disk_file_exact_probe_and_dir() {
        let base = std::env::temp_dir().join("ekko_run_resolve_test");
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("foo.ts"), "export {}").unwrap();
        std::fs::write(base.join("bar.mjs"), "export {}").unwrap();
        std::fs::create_dir_all(base.join("adir")).unwrap();

        assert_eq!(resolve_disk_file(&base.join("foo.ts")), Some(base.join("foo.ts")));
        
        assert_eq!(resolve_disk_file(&base.join("foo")), Some(base.join("foo.ts")));
        
        assert_eq!(resolve_disk_file(&base.join("bar")), Some(base.join("bar.mjs")));
        
        assert_eq!(resolve_disk_file(&base.join("nope")), None);
        
        assert_eq!(resolve_disk_file(&base.join("adir")), None);

        let _ = std::fs::remove_dir_all(&base);
    }
}
