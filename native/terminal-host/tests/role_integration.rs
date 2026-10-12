#![cfg(feature = "resident-fixtures")]

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant};

use portable_pty::{Child, CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use terminal_host_contracts::endpoint;
use terminal_host_contracts::roles::registry::RegistryStore;

#[test]
fn server_holder_and_attach_survive_client_loss_and_retain_output() {
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    let bin = directory(&release, "bin");
    std::fs::write(
        bin.join("ui.js"),
        r#"
process.stdin.setEncoding("utf8");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
let typed = "";
process.stdin.on("data", value => {
  for (const character of value) {
    if (character === "\u0003") { process.stdout.write("ctrl-c\r\n"); continue; }
    if (character === "\n" || character === "\r") {
      if (typed) process.stdout.write(`echo:${typed}\r\n`);
      typed = "";
    } else typed += character;
  }
});
process.stdout.write("fake-a1-ready\r\n");
setTimeout(() => process.stdout.write("detached-output\r\n"), 750);
setInterval(() => {}, 1000);
"#,
    )
    .expect("fake child");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    start_servers_concurrently(&executable, &profile, &data, &runtime, &address);

    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };

    let mut first = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        first.output_containing("fake-a1-ready", Duration::from_secs(15)),
        "{}",
        first.output_text()
    );
    // Platform: ConPTY consumes mouse/focus tracking controls before they reach the
    // fixture's outer-terminal capture; the mode-contract unit test covers those bytes.
    let observable_modes: &[&str] = if cfg!(windows) {
        &["1049", "2004", "2026"]
    } else {
        &["1049", "2004", "1004", "1000", "1006", "2026"]
    };
    for mode in observable_modes {
        assert!(
            first.output_text().contains(&format!("?{mode}h")),
            "missing outer mode {mode}: {}",
            first.output_text()
        );
    }
    if cfg!(unix) {
        assert!(
            first.output_text().contains("[>1u"),
            "{}",
            first.output_text()
        );
    }
    let mut competing = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        competing.output_containing("fake-a1-ready", Duration::from_secs(10)),
        "{}",
        competing.output_text()
    );
    competing.write(b"read-only-input\n");
    competing.write(b"\x03\x03");
    assert!(competing.wait(Duration::from_secs(8)).success());
    drop(competing);
    first.write(b"typed-value\n");
    assert!(
        first.output_containing("echo:typed-value", Duration::from_secs(10)),
        "{}",
        first.output_text()
    );
    first.write(b"\x03\x03");
    first.wait(Duration::from_secs(8));
    assert!(
        first.output_containing("1 tab still running", Duration::from_secs(2)),
        "{}",
        first.output_text()
    );
    for mode in observable_modes {
        assert!(
            first.output_text().contains(&format!("?{mode}l")),
            "missing restored mode {mode}: {}",
            first.output_text()
        );
    }
    if cfg!(unix) {
        assert!(
            first.output_text().contains("[<1u"),
            "{}",
            first.output_text()
        );
    }
    drop(first);
    std::thread::sleep(Duration::from_millis(1_000));

    let holder_before_replacement = holder_pids(&credentials_root);
    let epoch_before_replacement = registry_epoch(&credentials_root);
    assert_eq!(holder_before_replacement.len(), 1);
    for pid in server_pids(&credentials_root) {
        terminate(pid);
    }
    std::thread::sleep(Duration::from_millis(500));
    start_server(&executable, &profile, &data, &runtime, &address);
    cleanup.pids.extend(server_pids(&credentials_root));

    let mut second = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        second.output_containing("detached-output", Duration::from_secs(15)),
        "{}",
        second.output_text()
    );
    assert_eq!(holder_pids(&credentials_root), holder_before_replacement);
    assert!(registry_epoch(&credentials_root) > epoch_before_replacement);
    second.write(b"after-reattach\n");
    assert!(
        second.output_containing("echo:after-reattach", Duration::from_secs(10)),
        "{}",
        second.output_text()
    );
    second.lose_launch_tree();
    second.wait(Duration::from_secs(8));
    drop(second);

    let mut third = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        third.output_containing("echo:after-reattach", Duration::from_secs(15)),
        "{}",
        third.output_text()
    );
    third.write(b"after-forced-loss\n");
    assert!(
        third.output_containing("echo:after-forced-loss", Duration::from_secs(10)),
        "{}",
        third.output_text()
    );
    third.write(b"\x03\x03");
    third.wait(Duration::from_secs(8));

    cleanup.pids.extend(holder_pids(&credentials_root));
}

struct AttachFixture {
    child: Box<dyn Child + Send + Sync>,
    _master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    output: mpsc::Receiver<Vec<u8>>,
    retained: Vec<u8>,
    data_dir: PathBuf,
}
impl AttachFixture {
    fn spawn(
        executable: &Path,
        address: &str,
        profile: &Path,
        data: &Path,
        release: &Path,
    ) -> Self {
        let pair = NativePtySystem::default()
            .openpty(PtySize {
                rows: 24,
                cols: 100,
                pixel_width: 0,
                pixel_height: 0,
            })
            .expect("attach pty");
        let mut command = CommandBuilder::new(executable);
        command.env("TERMINAL_HOST_FIXTURE_SIZE", "100x24");
        command.args([
            "attach",
            "--endpoint",
            address,
            "--cwd",
            text(release),
            "--clear-exit-ms",
            "500",
            "--profile",
            text(profile),
            "--data-dir",
            text(data),
            "--release-root",
            text(release),
            "--node-executable",
            &node_executable(),
        ]);
        let child = pair.slave.spawn_command(command).expect("spawn attach");
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().expect("attach reader");
        let writer = Arc::new(Mutex::new(
            pair.master.take_writer().expect("attach writer"),
        ));
        let response_writer = writer.clone();
        let (tx, output) = mpsc::channel();
        std::thread::spawn(move || {
            let mut bytes = [0_u8; 16 * 1024];
            let mut query_tail = Vec::new();
            loop {
                match reader.read(&mut bytes) {
                    Ok(0) | Err(_) => return,
                    Ok(count) => {
                        query_tail.extend_from_slice(&bytes[..count]);
                        if query_tail.windows(4).any(|value| value == b"\x1b[?u") {
                            let mut response = response_writer.lock().expect("response writer");
                            let _ = response
                                .write_all(b"\x1b[?1u")
                                .and_then(|()| response.flush());
                            query_tail.clear();
                        } else if query_tail.windows(4).any(|value| value == b"\x1b[6n") {
                            let mut response = response_writer.lock().expect("response writer");
                            let _ = response
                                .write_all(b"\x1b[24;100R")
                                .and_then(|()| response.flush());
                            query_tail.clear();
                        } else if query_tail.len() > 3 {
                            query_tail.drain(..query_tail.len() - 3);
                        }
                        if tx.send(bytes[..count].to_vec()).is_err() {
                            return;
                        }
                    }
                }
            }
        });
        Self {
            child,
            _master: pair.master,
            writer,
            output,
            retained: Vec::new(),
            data_dir: data.to_path_buf(),
        }
    }
    fn write(&mut self, bytes: &[u8]) {
        let mut writer = self.writer.lock().expect("attach writer");
        writer
            .write_all(bytes)
            .and_then(|()| writer.flush())
            .expect("attach input");
    }
    fn output_containing(&mut self, needle: &str, timeout: Duration) -> bool {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            match self.output.recv_timeout(Duration::from_millis(100)) {
                Ok(bytes) => {
                    self.retained.extend(bytes);
                    if String::from_utf8_lossy(&self.retained).contains(needle) {
                        return true;
                    }
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => return false,
            }
        }
        false
    }
    fn lose_launch_tree(&mut self) {
        let pid = self.child.process_id().expect("attach pid");
        terminate_launch_tree(pid);
    }
    fn output_text(&self) -> String {
        let output = String::from_utf8_lossy(&self.retained);
        let registry = std::fs::read_dir(self.data_dir.join("tabs"))
            .ok()
            .and_then(|mut roots| roots.next())
            .and_then(Result::ok)
            .and_then(|root| std::fs::read_to_string(root.path().join("registry.json")).ok())
            .unwrap_or_else(|| "registry unavailable".into());
        format!("{output}\n--- registry ---\n{registry}")
    }
    fn wait(&mut self, timeout: Duration) -> portable_pty::ExitStatus {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            if let Some(status) = self.child.try_wait().expect("attach status") {
                return status;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        let _ = self.child.kill();
        panic!("attach process did not exit");
    }
}

fn server_command(
    executable: &Path,
    profile: &Path,
    data: &Path,
    runtime: &Path,
    address: &str,
) -> Command {
    let mut command = Command::new(executable);
    command
        .args([
            "server",
            "--detach",
            "--profile",
            text(profile),
            "--data-dir",
            text(data),
            "--runtime-dir",
            text(runtime),
        ])
        .env("A1_TABS_ENDPOINT", address);
    command
}

fn start_servers_concurrently(
    executable: &Path,
    profile: &Path,
    data: &Path,
    runtime: &Path,
    address: &str,
) {
    let first = server_command(executable, profile, data, runtime, address)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("start first server command");
    let second = server_command(executable, profile, data, runtime, address)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("start second server command");
    let first = first.wait_with_output().expect("first server outcome");
    let second = second.wait_with_output().expect("second server outcome");
    assert!(
        first.status.success(),
        "{}",
        String::from_utf8_lossy(&first.stderr)
    );
    assert!(
        second.status.success(),
        "{}",
        String::from_utf8_lossy(&second.stderr)
    );
    let outcomes = format!(
        "{}{}",
        String::from_utf8_lossy(&first.stdout),
        String::from_utf8_lossy(&second.stdout)
    );
    assert_eq!(
        outcomes.matches("\"outcome\":\"started\"").count(),
        1,
        "{outcomes}"
    );
    assert_eq!(
        outcomes.matches("\"outcome\":\"already-running\"").count(),
        1,
        "{outcomes}"
    );
}

fn start_server(executable: &Path, profile: &Path, data: &Path, runtime: &Path, address: &str) {
    let mut diagnostic = String::new();
    for _ in 0..20 {
        let started = server_command(executable, profile, data, runtime, address)
            .output()
            .expect("start server");
        if started.status.success() {
            return;
        }
        diagnostic = String::from_utf8_lossy(&started.stderr).into_owned();
        std::thread::sleep(Duration::from_millis(100));
    }
    panic!("server did not start: {diagnostic}");
}

fn server_pids(root: &Path) -> Vec<u32> {
    serde_json::from_slice::<serde_json::Value>(
        &std::fs::read(root.join("server.json")).expect("server metadata"),
    )
    .ok()
    .and_then(|value| value.get("pid").and_then(serde_json::Value::as_u64))
    .map(|pid| vec![pid as u32])
    .unwrap_or_default()
}
fn registry_epoch(root: &Path) -> u64 {
    RegistryStore::read(&root.join("registry.json"))
        .expect("read registry")
        .expect("registry document")
        .epoch
}
fn holder_pids(root: &Path) -> Vec<u32> {
    RegistryStore::read(&root.join("registry.json"))
        .ok()
        .flatten()
        .map(|registry| {
            registry
                .tabs
                .into_iter()
                .filter_map(|tab| tab.holder_pid)
                .collect()
        })
        .unwrap_or_default()
}
fn node_executable() -> String {
    let output = Command::new(if cfg!(windows) { "node.exe" } else { "node" })
        .args(["-p", "process.execPath"])
        .output()
        .expect("resolve node");
    assert!(output.status.success());
    String::from_utf8(output.stdout)
        .expect("node path")
        .trim()
        .to_owned()
}
fn directory(root: &Path, name: &str) -> PathBuf {
    let value = root.join(name);
    std::fs::create_dir_all(&value).expect("directory");
    value
}
fn text(path: &Path) -> &str {
    path.to_str().expect("utf8 fixture path")
}
#[cfg(unix)]
fn protect_runtime(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
        .expect("runtime permissions");
}
#[cfg(windows)]
fn protect_runtime(_path: &Path) {}
#[cfg(unix)]
fn fixture_endpoint(root: &Path) -> String {
    root.join("resident.sock").to_string_lossy().into_owned()
}
#[cfg(windows)]
fn fixture_endpoint(_root: &Path) -> String {
    format!(
        r"\\.\pipe\a1-tabs-integration-{}-{:x}",
        std::process::id(),
        rand::random::<u64>()
    )
}

struct Cleanup {
    credentials_root: PathBuf,
    pids: Vec<u32>,
}
impl Drop for Cleanup {
    fn drop(&mut self) {
        self.pids.extend(holder_pids(&self.credentials_root));
        self.pids.sort_unstable();
        self.pids.dedup();
        for pid in self.pids.iter().rev().copied() {
            terminate(pid);
        }
    }
}
#[cfg(unix)]
fn terminate_launch_tree(pid: u32) {
    assert_eq!(unsafe { libc::kill(-(pid as i32), libc::SIGHUP) }, 0);
}
#[cfg(windows)]
fn terminate_launch_tree(pid: u32) {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
        SetInformationJobObject,
    };
    use windows_sys::Win32::System::Threading::{
        OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE,
    };
    let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    assert!(!job.is_null(), "create attach-loss job");
    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    assert_ne!(
        unsafe {
            SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                std::ptr::addr_of!(limits).cast(),
                std::mem::size_of_val(&limits) as u32,
            )
        },
        0,
        "configure attach-loss job"
    );
    let process = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
    assert!(!process.is_null(), "open attach process");
    assert_ne!(
        unsafe { AssignProcessToJobObject(job, process) },
        0,
        "assign attach process"
    );
    unsafe {
        CloseHandle(process);
        CloseHandle(job);
    }
}
#[cfg(unix)]
fn terminate(pid: u32) {
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
}
#[cfg(windows)]
fn terminate(pid: u32) {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_TERMINATE, TerminateProcess};
    let handle = unsafe { OpenProcess(PROCESS_TERMINATE, 0, pid) };
    if !handle.is_null() {
        unsafe {
            TerminateProcess(handle, 125);
            CloseHandle(handle);
        }
    }
}
