#![cfg(feature = "resident-fixtures")]

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc;
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
process.stdin.on("data", value => process.stdout.write(`echo:${value}\r\n`));
process.stdout.write("fake-a1-ready\r\n");
setTimeout(() => process.stdout.write("detached-output\r\n"), 750);
setInterval(() => {}, 1000);
"#,
    )
    .expect("fake child");
    let address = fixture_endpoint(root.path());
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let started = Command::new(&executable)
        .args([
            "server",
            "--detach",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
        ])
        .env("A1_TABS_ENDPOINT", &address)
        .output()
        .expect("start server");
    assert!(
        started.status.success(),
        "{}",
        String::from_utf8_lossy(&started.stderr)
    );

    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };

    let mut first = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(first.output_containing("fake-a1-ready", Duration::from_secs(15)));
    first.write(b"typed-value\n");
    assert!(first.output_containing("echo:typed-value", Duration::from_secs(10)));
    first.write(b"\x03\x03");
    first.wait(Duration::from_secs(8));
    drop(first);
    std::thread::sleep(Duration::from_millis(1_000));

    let mut second = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(second.output_containing("detached-output", Duration::from_secs(15)));
    second.write(b"after-reattach\n");
    assert!(second.output_containing("echo:after-reattach", Duration::from_secs(10)));
    second.child.kill().expect("force attach death");
    second.wait(Duration::from_secs(8));
    drop(second);

    let mut third = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(third.output_containing("echo:after-reattach", Duration::from_secs(15)));
    third.write(b"after-forced-loss\n");
    assert!(third.output_containing("echo:after-forced-loss", Duration::from_secs(10)));
    third.write(b"\x03\x03");
    third.wait(Duration::from_secs(8));

    cleanup.pids.extend(holder_pids(&credentials_root));
}

struct AttachFixture {
    child: Box<dyn Child + Send + Sync>,
    _master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    output: mpsc::Receiver<Vec<u8>>,
    retained: Vec<u8>,
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
        let writer = pair.master.take_writer().expect("attach writer");
        let (tx, output) = mpsc::channel();
        std::thread::spawn(move || {
            let mut bytes = [0_u8; 16 * 1024];
            loop {
                match reader.read(&mut bytes) {
                    Ok(0) | Err(_) => return,
                    Ok(count) => {
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
        }
    }
    fn write(&mut self, bytes: &[u8]) {
        self.writer
            .write_all(bytes)
            .and_then(|()| self.writer.flush())
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
    fn wait(&mut self, timeout: Duration) {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            if self.child.try_wait().expect("attach status").is_some() {
                return;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        let _ = self.child.kill();
        panic!("attach process did not exit");
    }
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
