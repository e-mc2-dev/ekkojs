// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use std::path::Path;
use std::process::{Child, Command};

#[cfg(unix)]
use std::sync::atomic::{AtomicI32, Ordering};

#[cfg(unix)]
static CURRENT_PGID: AtomicI32 = AtomicI32::new(0);

pub struct DevServer {
    child: Child,

    port: u16,
    
    token: String,
    #[cfg(windows)]
    job: JobHandle,
    #[cfg(unix)]
    pgid: i32,
}

#[cfg(windows)]
mod winjob {
    use std::ffi::c_void;

    pub type Handle = *mut c_void;

    pub const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS: i32 = 9;
    
    pub const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x0000_2000;

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct JobBasicLimitInformation {
        pub per_process_user_time_limit: i64,
        pub per_job_user_time_limit: i64,
        pub limit_flags: u32,
        pub minimum_working_set_size: usize,
        pub maximum_working_set_size: usize,
        pub active_process_limit: u32,
        pub affinity: usize,
        pub priority_class: u32,
        pub scheduling_class: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct IoCounters {
        pub read_operation_count: u64,
        pub write_operation_count: u64,
        pub other_operation_count: u64,
        pub read_transfer_count: u64,
        pub write_transfer_count: u64,
        pub other_transfer_count: u64,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct JobExtendedLimitInformation {
        pub basic_limit_information: JobBasicLimitInformation,
        pub io_info: IoCounters,
        pub process_memory_limit: usize,
        pub job_memory_limit: usize,
        pub peak_process_memory_used: usize,
        pub peak_job_memory_used: usize,
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        pub fn CreateJobObjectW(attrs: *mut c_void, name: *const u16) -> Handle;
        pub fn SetInformationJobObject(
            job: Handle,
            class: i32,
            info: *const c_void,
            len: u32,
        ) -> i32;
        pub fn AssignProcessToJobObject(job: Handle, process: Handle) -> i32;
        pub fn CloseHandle(handle: Handle) -> i32;
    }
}

#[cfg(windows)]
struct JobHandle(winjob::Handle);

#[cfg(windows)]
impl Drop for JobHandle {
    fn drop(&mut self) {
        unsafe {
            winjob::CloseHandle(self.0);
        }
    }
}

impl DevServer {

    pub fn spawn(
        file: &Path,
        port: Option<&str>,
        allow: &[String],
        dev: bool,
        token: &str,
    ) -> anyhow::Result<DevServer> {
        let exe = std::env::current_exe()?;
        let mut cmd = Command::new(&exe);
        cmd.arg("run");
        
        if !allow.is_empty() {
            cmd.arg(format!("--allow={}", allow.join(",")));
        }
        cmd.arg(file);
        if let Some(p) = port {
            cmd.env("PORT", p);
        }
        if dev {
            cmd.env("EKKO_DEV", "1");
            cmd.env("EKKO_DEV_TOKEN", token);
        }

        #[cfg(unix)]
        unsafe {
            use std::os::unix::process::CommandExt;
            cmd.pre_exec(|| {

                libc::setsid();
                
                #[cfg(target_os = "linux")]
                {
                    libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL as libc::c_ulong, 0, 0, 0);
                }
                Ok(())
            });
        }

        let child = cmd.spawn()?;

        #[cfg(windows)]
        let job = unsafe { assign_to_kill_job(&child)? };

        #[cfg(unix)]
        let pgid = child.id() as i32; 
        #[cfg(unix)]
        CURRENT_PGID.store(pgid, Ordering::SeqCst);

        let port = port.and_then(|p| p.parse::<u16>().ok()).unwrap_or(3000);

        Ok(DevServer {
            child,
            port,
            token: token.to_string(),
            #[cfg(windows)]
            job,
            #[cfg(unix)]
            pgid,
        })
    }

    
    fn try_graceful(&mut self) -> bool {
        use std::io::Write;
        let addr = match format!("127.0.0.1:{}", self.port).parse::<std::net::SocketAddr>() {
            Ok(a) => a,
            Err(_) => return false,
        };
        let stream = std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(400));
        let mut stream = match stream {
            Ok(s) => s,
            Err(_) => return false, 
        };
        let _ = stream.set_write_timeout(Some(std::time::Duration::from_millis(400)));
        let req = format!(
            "POST /__ekko_dev/shutdown HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nX-Ekko-Dev-Token: {}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
            self.port, self.token
        );
        if stream.write_all(req.as_bytes()).is_err() {
            return false;
        }
        let _ = stream.flush();
        
        for _ in 0..30 {
            if matches!(self.child.try_wait(), Ok(Some(_))) {
                return true;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        false
    }

    pub fn pid(&self) -> u32 {
        self.child.id()
    }

    pub fn try_wait(&mut self) -> std::io::Result<Option<std::process::ExitStatus>> {
        self.child.try_wait()
    }

    
    
    pub fn stop(&mut self) {
        if self.try_graceful() {
            println!("\x1b[2m[dev] server stopped gracefully\x1b[0m");
            let _ = self.child.wait();
            #[cfg(unix)]
            CURRENT_PGID.store(0, Ordering::SeqCst);
            return;
        }
        #[cfg(unix)]
        unsafe {
            
            libc::kill(-self.pgid, libc::SIGTERM);
            for _ in 0..20 {
                if matches!(self.child.try_wait(), Ok(Some(_))) {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            libc::kill(-self.pgid, libc::SIGKILL);
        }
        #[cfg(windows)]
        {
            
            let _ = self.child.kill();
        }
        let _ = self.child.wait();
        #[cfg(unix)]
        CURRENT_PGID.store(0, Ordering::SeqCst);
    }
}

impl Drop for DevServer {
    fn drop(&mut self) {
        
        #[cfg(unix)]
        unsafe {
            libc::kill(-self.pgid, libc::SIGKILL);
        }
        
        let _ = self.child.try_wait();
    }
}

#[cfg(windows)]
unsafe fn assign_to_kill_job(child: &Child) -> anyhow::Result<JobHandle> {
    use std::os::windows::io::AsRawHandle;
    use winjob::*;

    let job = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
    if job.is_null() {
        anyhow::bail!("CreateJobObjectW failed");
    }
    let mut info: JobExtendedLimitInformation = std::mem::zeroed();
    info.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    let ok = SetInformationJobObject(
        job,
        JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS,
        &info as *const _ as *const std::ffi::c_void,
        std::mem::size_of::<JobExtendedLimitInformation>() as u32,
    );
    if ok == 0 {
        CloseHandle(job);
        anyhow::bail!("SetInformationJobObject failed");
    }
    let h = child.as_raw_handle() as Handle;
    if AssignProcessToJobObject(job, h) == 0 {
        CloseHandle(job);
        anyhow::bail!("AssignProcessToJobObject failed");
    }
    Ok(JobHandle(job))
}

pub fn install_ctrlc_guard() {
    let _ = ctrlc::set_handler(move || {
        eprintln!("\n\x1b[2m[ekko dev] shutting down...\x1b[0m");
        #[cfg(unix)]
        {
            let pgid = CURRENT_PGID.load(Ordering::SeqCst);
            if pgid != 0 {
                unsafe {
                    libc::kill(-pgid, libc::SIGKILL);
                }
            }
        }

        std::process::exit(130);
    });
}

pub fn dev_token() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:x}{:x}", std::process::id(), nanos)
}
