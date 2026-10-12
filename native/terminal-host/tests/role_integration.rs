#![cfg(feature = "resident-fixtures")]

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant};

use portable_pty::{Child, CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use terminal_host_contracts::endpoint;
use terminal_host_contracts::roles::registry::RegistryStore;

static ROLE_TEST_SERIAL: Mutex<()> = Mutex::new(());

fn serialize_role_fixture() -> std::sync::MutexGuard<'static, ()> {
    ROLE_TEST_SERIAL
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

#[test]
fn server_holder_and_attach_survive_client_loss_and_retain_output() {
    let _serial = serialize_role_fixture();
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

#[test]
fn crashed_child_restarts_in_the_same_holder_with_persisted_budget() {
    let _serial = serialize_role_fixture();
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
const fs = require("node:fs");
const path = require("node:path");
const marker = path.join(__dirname, "first-child-crashed");
if (!fs.existsSync(marker)) {
  fs.writeFileSync(marker, "crashed");
  process.stdout.write("first-incarnation\r\n");
  setTimeout(() => process.exit(17), 250);
} else {
  process.stdout.write("recovered-incarnation\r\n");
  process.stdin.resume();
  setInterval(() => {}, 1000);
}
"#,
    )
    .expect("fake crash-recovery child");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    start_server(&executable, &profile, &data, &runtime, &address);
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    let mut attach = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        attach.output_containing("first-incarnation", Duration::from_secs(15)),
        "{}",
        attach.output_text()
    );
    assert!(
        attach.output_containing("recovered-incarnation", Duration::from_secs(15)),
        "{}",
        attach.output_text()
    );
    let registry = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read recovery registry")
        .expect("recovery registry");
    let tab = registry.tabs.first().expect("recovered tab");
    assert_eq!(tab.lifecycle, "running");
    assert_eq!(tab.incarnation, 2);
    assert_eq!(tab.restarts, 1);
    assert_eq!(tab.last_exit.as_deref(), Some("exit 17"));
    attach.write(b"\x03\x03");
    attach.wait(Duration::from_secs(8));
    cleanup.pids.extend(holder_pids(&credentials_root));
}

#[test]
fn blocked_identity_inspection_times_out_without_stalling_server_progress() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    directory(&release, "bin");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_DELAY_HOLDER_IDENTITY_MS", "3000");
    assert!(
        server
            .output()
            .expect("delayed-identity server")
            .status
            .success()
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut create = Command::new(&executable);
    create
        .args([
            "internal",
            "tab-create",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
            "--cwd",
            text(&release),
            "--release-root",
            text(&release),
            "--node-executable",
            env!("CARGO_BIN_EXE_fake-tab"),
        ])
        .current_dir(&release)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let create = create.spawn().expect("delayed tab create");
    std::thread::sleep(Duration::from_millis(500));
    let probe_started = Instant::now();
    let probe = Command::new(&executable)
        .args([
            "probe",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
        ])
        .output()
        .expect("probe during delayed identity");
    assert!(probe.status.success());
    assert!(probe_started.elapsed() < Duration::from_secs(2));
    let output = create.wait_with_output().expect("delayed identity result");
    assert!(!output.status.success());
    std::thread::sleep(Duration::from_millis(1500));
    let probe = Command::new(&executable)
        .args([
            "probe",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
        ])
        .output()
        .expect("probe after late identity completion");
    assert!(probe.status.success());
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    cleanup.pids.extend(holder_pids(&credentials_root));
}

#[test]
fn blocked_registry_sync_times_out_without_stalling_server_progress() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    directory(&release, "bin");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_DELAY_REGISTRY_FSYNC_MS", "6000");
    assert!(
        server
            .output()
            .expect("delayed-fsync server")
            .status
            .success()
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut create = Command::new(&executable);
    create
        .args([
            "internal",
            "tab-create",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
            "--cwd",
            text(&release),
            "--release-root",
            text(&release),
            "--node-executable",
            env!("CARGO_BIN_EXE_fake-tab"),
        ])
        .current_dir(&release)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let create = create.spawn().expect("delayed tab create");
    std::thread::sleep(Duration::from_millis(500));
    let probe_started = Instant::now();
    let probe = Command::new(&executable)
        .args([
            "probe",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
        ])
        .output()
        .expect("probe during delayed fsync");
    assert!(probe.status.success());
    assert!(probe_started.elapsed() < Duration::from_secs(2));
    let output = create
        .wait_with_output()
        .expect("delayed tab create result");
    assert!(!output.status.success());
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("registry persistence deadline exceeded")
    );
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    cleanup.pids.extend(holder_pids(&credentials_root));
}

#[test]
fn server_crash_points_recover_without_empty_or_split_registry_state() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    for point in ["after-lease", "after-epoch", "after-marker", "after-bind"] {
        let profile = directory(root.path(), &format!("profile-{point}"));
        let data = directory(root.path(), &format!("data-{point}"));
        let runtime = directory(root.path(), &format!("runtime-{point}"));
        protect_runtime(&runtime);
        let address = fixture_endpoint(&runtime);
        let mut crashed = server_command(&executable, &profile, &data, &runtime, &address);
        crashed.env("A1_TABS_FAULT_CRASH_POINT", point);
        let output = crashed.output().expect("crash-point start");
        assert!(
            !output.status.success(),
            "crash point {point} did not crash"
        );
        let credentials_root = data
            .join("tabs")
            .join(endpoint::endpoint_token(&profile).expect("profile token"));
        if credentials_root.join("registry.json").is_file() {
            assert!(
                RegistryStore::read(&credentials_root.join("registry.json"))
                    .expect("parse crash-point registry")
                    .is_some()
            );
        }
        start_server(&executable, &profile, &data, &runtime, &address);
        let mut cleanup = Cleanup {
            credentials_root: credentials_root.clone(),
            pids: server_pids(&credentials_root),
        };
        cleanup.pids.extend(holder_pids(&credentials_root));
    }
}

#[test]
fn every_role_watchdog_records_and_terminates_only_its_frozen_process() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let release = directory(root.path(), "release");
    directory(&release, "bin");

    let frozen_profile = directory(root.path(), "frozen-profile");
    let frozen_data = directory(root.path(), "frozen-data");
    let frozen_runtime = directory(root.path(), "frozen-runtime");
    protect_runtime(&frozen_runtime);
    let frozen_address = fixture_endpoint(&frozen_runtime);
    let mut frozen_server = server_command(
        &executable,
        &frozen_profile,
        &frozen_data,
        &frozen_runtime,
        &frozen_address,
    );
    frozen_server.env("A1_TABS_FAULT_FREEZE_ROLE", "server");
    let frozen_server = frozen_server.output().expect("frozen server start");
    assert!(
        frozen_server.status.success(),
        "{}",
        String::from_utf8_lossy(&frozen_server.stderr)
    );

    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let address = fixture_endpoint(&runtime);
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_FREEZE_ROLE", "holder");
    assert!(
        server
            .output()
            .expect("holder-watchdog server")
            .status
            .success()
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let output = internal_command(
        &executable,
        "tab-create",
        &profile,
        &data,
        &runtime,
        &release,
        &[
            "--cwd",
            text(&release),
            "--release-root",
            text(&release),
            "--node-executable",
            env!("CARGO_BIN_EXE_fake-tab"),
        ],
    );
    assert!(output.contains("tabId"), "{output}");

    let mut attach = Command::new(&executable);
    attach
        .args([
            "attach",
            "--endpoint",
            &address,
            "--cwd",
            text(&release),
            "--clear-exit-ms",
            "500",
            "--profile",
            text(&profile),
            "--data-dir",
            text(&data),
            "--runtime-dir",
            text(&runtime),
            "--release-root",
            text(&release),
            "--node-executable",
            env!("CARGO_BIN_EXE_fake-tab"),
        ])
        .env("A1_TABS_FAULT_FREEZE_ROLE", "attach")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let mut attach = attach.spawn().expect("frozen attach");

    let deadline = Instant::now() + Duration::from_secs(25);
    loop {
        let mut roles = crash_roles(&frozen_runtime.join("tabs").join("crashes"));
        roles.extend(crash_roles(&runtime.join("tabs").join("crashes")));
        roles.extend(crash_roles(&credentials_root.join("diagnostics")));
        if ["server", "holder", "attach"]
            .iter()
            .all(|role| roles.contains(*role))
        {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "watchdog records missing: {roles:?}"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    let _ = attach.wait();
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    cleanup.pids.extend(holder_pids(&credentials_root));
}

#[test]
fn registry_retries_transient_ebusy_and_fails_closed_on_enospc() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    for (mode, succeeds) in [("ebusy-once", true), ("enospc", false)] {
        let profile = directory(root.path(), &format!("profile-{mode}"));
        let data = directory(root.path(), &format!("data-{mode}"));
        let runtime = directory(root.path(), &format!("runtime-{mode}"));
        protect_runtime(&runtime);
        let address = fixture_endpoint(&runtime);
        let output = server_command(&executable, &profile, &data, &runtime, &address)
            .env("A1_TABS_FAULT_REGISTRY_REPLACE", mode)
            .output()
            .expect("faulted registry server");
        assert_eq!(
            output.status.success(),
            succeeds,
            "{mode}: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        let credentials_root = data
            .join("tabs")
            .join(endpoint::endpoint_token(&profile).expect("profile token"));
        if succeeds {
            let cleanup = Cleanup {
                credentials_root: credentials_root.clone(),
                pids: server_pids(&credentials_root),
            };
            assert!(credentials_root.join("registry.json").is_file());
            drop(cleanup);
        } else {
            assert!(!credentials_root.join("registry.json").is_file());
        }
    }
}

#[test]
fn ten_concurrent_tab_starts_respect_the_server_limit() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    directory(&release, "bin");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let fake_tab = env!("CARGO_BIN_EXE_fake-tab");
    start_server(&executable, &profile, &data, &runtime, &address);
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };

    std::thread::scope(|scope| {
        let handles = (0..10)
            .map(|_| {
                scope.spawn(|| {
                    internal_command(
                        &executable,
                        "tab-create",
                        &profile,
                        &data,
                        &runtime,
                        &release,
                        &[
                            "--cwd",
                            text(&release),
                            "--release-root",
                            text(&release),
                            "--node-executable",
                            fake_tab,
                        ],
                    )
                })
            })
            .collect::<Vec<_>>();
        for handle in handles {
            let output = handle.join().expect("tab start thread");
            assert!(output.contains("tabId"), "{output}");
        }
    });
    let registry = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read registry")
        .expect("registry");
    assert_eq!(registry.tabs.len(), 10);
    assert!(registry.tabs.iter().all(|tab| tab.lifecycle == "running"));
    assert_eq!(holder_identities(&credentials_root).len(), 10);
    for child in registry.tabs.iter().filter_map(|tab| tab.child_pid) {
        terminate(child);
    }
    let restart_deadline = Instant::now() + Duration::from_secs(30);
    loop {
        let restarted = RegistryStore::read(&credentials_root.join("registry.json"))
            .expect("read restarted registry")
            .expect("restarted registry");
        if restarted.tabs.len() == 10
            && restarted.tabs.iter().all(|tab| {
                tab.lifecycle == "running"
                    && tab.incarnation == 2
                    && tab.restarts == 1
                    && tab.child_pid.is_some()
            })
        {
            break;
        }
        assert!(
            Instant::now() < restart_deadline,
            "ten child restarts did not converge: {restarted:?}"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    let registry = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read converged registry")
        .expect("converged registry");
    for holder in registry.tabs.iter().filter_map(|tab| tab.holder_pid) {
        terminate_launch_tree(holder);
    }
    let holder_deadline = Instant::now() + Duration::from_secs(45);
    let registry = loop {
        let restarted = RegistryStore::read(&credentials_root.join("registry.json"))
            .expect("read holder-restarted registry")
            .expect("holder-restarted registry");
        if restarted.tabs.len() == 10
            && restarted.tabs.iter().all(|tab| {
                tab.lifecycle == "running"
                    && tab.incarnation == 3
                    && tab.restarts == 2
                    && tab.child_pid.is_some()
                    && tab.holder_pid.is_some()
            })
        {
            break restarted;
        }
        assert!(
            Instant::now() < holder_deadline,
            "ten holder restarts did not converge: {restarted:?}"
        );
        std::thread::sleep(Duration::from_millis(100));
    };
    let stopping = registry
        .tabs
        .iter()
        .take(6)
        .map(|tab| tab.tab_id.clone())
        .collect::<Vec<_>>();
    std::thread::scope(|scope| {
        let handles = stopping
            .iter()
            .map(|tab_id| {
                scope.spawn(|| {
                    internal_command(
                        &executable,
                        "tab-close",
                        &profile,
                        &data,
                        &runtime,
                        &release,
                        &["--tab", tab_id],
                    )
                })
            })
            .collect::<Vec<_>>();
        for handle in handles {
            handle.join().expect("tab stop thread");
        }
    });
    let deadline = Instant::now() + Duration::from_secs(12);
    loop {
        let current = RegistryStore::read(&credentials_root.join("registry.json"))
            .expect("read stopped registry")
            .expect("stopped registry");
        if stopping.iter().all(|tab_id| {
            current
                .tabs
                .iter()
                .find(|tab| &tab.tab_id == tab_id)
                .is_some_and(|tab| tab.lifecycle == "stopped")
        }) {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "six concurrent stops did not finish"
        );
        let probe = Command::new(&executable)
            .args([
                "probe",
                "--profile",
                text(&profile),
                "--data-dir",
                text(&data),
                "--runtime-dir",
                text(&runtime),
            ])
            .output()
            .expect("probe during stops");
        assert!(probe.status.success());
        std::thread::sleep(Duration::from_millis(100));
    }
    cleanup.pids.extend(holder_pids(&credentials_root));
}

#[test]
fn recovery_refuses_unverifiable_owners_and_enforces_the_start_budget() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    std::fs::create_dir_all(&credentials_root).expect("credentials root");
    std::fs::write(
        credentials_root.join("server.json"),
        serde_json::to_vec(&serde_json::json!({
            "pid": std::process::id(),
            "startIdentity": "not-the-test-process",
            "endpoint": address,
            "generation": 1,
            "verified": true,
            "detachmentMode": "fixture"
        }))
        .unwrap(),
    )
    .expect("unverifiable marker");
    let blocked = server_command(&executable, &profile, &data, &runtime, &address)
        .output()
        .expect("blocked start");
    assert!(!blocked.status.success());
    assert!(String::from_utf8_lossy(&blocked.stderr).contains("host-recovery-blocked"));
    std::fs::remove_file(credentials_root.join("server.json")).expect("remove marker");

    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: Vec::new(),
    };
    for attempt in 0..3 {
        let started = server_command(&executable, &profile, &data, &runtime, &address)
            .output()
            .expect("budgeted start");
        assert!(
            started.status.success(),
            "attempt {attempt}: {}",
            String::from_utf8_lossy(&started.stderr)
        );
        let pids = server_pids(&credentials_root);
        cleanup.pids.extend(&pids);
        for pid in pids {
            terminate(pid);
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    let exhausted = server_command(&executable, &profile, &data, &runtime, &address)
        .output()
        .expect("exhausted start");
    assert!(!exhausted.status.success());
    assert!(String::from_utf8_lossy(&exhausted.stderr).contains("host-start-budget-exhausted"));

    let mut restart = server_command(&executable, &profile, &data, &runtime, &address);
    restart.arg("--restart");
    let restarted = restart.output().expect("explicit restart");
    assert!(
        restarted.status.success(),
        "{}",
        String::from_utf8_lossy(&restarted.stderr)
    );
    cleanup.pids.extend(server_pids(&credentials_root));
}

#[test]
fn two_tabs_are_isolated_and_readmitted_after_server_replacement() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    directory(&release, "bin");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let fake_tab = env!("CARGO_BIN_EXE_fake-tab");
    start_servers_concurrently(&executable, &profile, &data, &runtime, &address);

    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };

    let mut first = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        None,
    );
    assert!(first.output_containing("fake-tab-ready", Duration::from_secs(15)));
    first.write(b"first-tab\n");
    assert!(first.output_containing("echo:first-tab", Duration::from_secs(10)));

    let created = internal_command(
        &executable,
        "tab-create",
        &profile,
        &data,
        &runtime,
        &release,
        &[
            "--cwd",
            text(&release),
            "--release-root",
            text(&release),
            "--node-executable",
            fake_tab,
        ],
    );
    let second_tab = serde_json::from_str::<serde_json::Value>(&created).expect("tab-create json")
        ["tabId"]
        .as_str()
        .expect("created tab id")
        .to_owned();
    let listed = internal_command(
        &executable,
        "tab-list",
        &profile,
        &data,
        &runtime,
        &release,
        &[],
    );
    let list = serde_json::from_str::<serde_json::Value>(&listed).expect("tab-list json");
    assert_eq!(list["tabs"].as_array().expect("tab list").len(), 2);

    let mut second = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        Some(&second_tab),
    );
    assert!(second.output_containing("fake-tab-ready", Duration::from_secs(15)));
    second.write(b"second-tab\n");
    assert!(second.output_containing("echo:second-tab", Duration::from_secs(10)));
    first.write(b"first-still-live\n");
    assert!(first.output_containing("echo:first-still-live", Duration::from_secs(10)));

    let mut read_only = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        Some(&second_tab),
    );
    assert!(read_only.output_containing("fake-tab-ready", Duration::from_secs(10)));
    read_only.write(b"must-not-reach-child\n");
    assert!(
        read_only.output_containing("read-only-viewer", Duration::from_secs(5)),
        "{}",
        read_only.output_text()
    );
    assert!(!read_only.output_containing("echo:must-not-reach-child", Duration::from_secs(1)));
    read_only.write(b"\x03\x03");
    assert!(read_only.wait(Duration::from_secs(8)).success());

    let holders_before_client_loss = holder_identities(&credentials_root);
    first.lose_launch_tree();
    second.lose_launch_tree();
    first.wait(Duration::from_secs(8));
    second.wait(Duration::from_secs(8));
    std::thread::sleep(Duration::from_millis(500));
    assert_eq!(
        holder_identities(&credentials_root),
        holders_before_client_loss
    );

    let epoch_before = registry_epoch(&credentials_root);
    for pid in server_pids(&credentials_root) {
        terminate(pid);
    }
    start_server(&executable, &profile, &data, &runtime, &address);
    cleanup.pids.extend(server_pids(&credentials_root));
    assert!(registry_epoch(&credentials_root) > epoch_before);
    assert_eq!(
        holder_identities(&credentials_root),
        holders_before_client_loss
    );

    let default_tab = holders_before_client_loss
        .iter()
        .find(|(tab, _, _)| tab != &second_tab)
        .expect("default tab")
        .0
        .clone();
    let mut reattached_first = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        Some(&default_tab),
    );
    let mut reattached_second = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        Some(&second_tab),
    );
    assert!(reattached_first.output_containing("echo:first-still-live", Duration::from_secs(15)));
    assert!(reattached_second.output_containing("echo:second-tab", Duration::from_secs(15)));
    reattached_first.write(b"\x03\x03");
    reattached_second.write(b"\x03\x03");
    reattached_first.wait(Duration::from_secs(8));
    reattached_second.wait(Duration::from_secs(8));

    internal_command(
        &executable,
        "tab-close",
        &profile,
        &data,
        &runtime,
        &release,
        &["--tab", &second_tab],
    );
    let closed = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read closed registry")
        .expect("closed registry");
    assert_eq!(
        closed
            .tabs
            .iter()
            .find(|tab| tab.tab_id == second_tab)
            .expect("closed tab")
            .desired,
        "stopped"
    );
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
        Self::spawn_view(
            executable,
            address,
            profile,
            data,
            release,
            &node_executable(),
            None,
        )
    }
    fn spawn_view(
        executable: &Path,
        address: &str,
        profile: &Path,
        data: &Path,
        release: &Path,
        child_executable: &str,
        view_tab: Option<&str>,
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
            "--runtime-dir",
            text(data),
            "--release-root",
            text(release),
            "--node-executable",
            child_executable,
        ]);
        if let Some(tab_id) = view_tab {
            command.args(["--view", tab_id]);
        }
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

fn internal_command(
    executable: &Path,
    operation: &str,
    profile: &Path,
    data: &Path,
    runtime: &Path,
    release: &Path,
    extra: &[&str],
) -> String {
    let mut arguments = vec![
        "internal",
        operation,
        "--profile",
        text(profile),
        "--data-dir",
        text(data),
        "--runtime-dir",
        text(runtime),
    ];
    arguments.extend_from_slice(extra);
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(profile).expect("profile token"));
    let marker: serde_json::Value = serde_json::from_slice(
        &std::fs::read(credentials_root.join("server.json")).expect("server marker"),
    )
    .expect("server marker json");
    let address = marker["endpoint"].as_str().expect("server marker endpoint");
    let output = Command::new(executable)
        .args(arguments)
        .env("A1_TABS_ENDPOINT", address)
        .current_dir(release)
        .output()
        .expect("run internal tab command");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout)
        .expect("internal command output")
        .trim()
        .to_owned()
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
fn holder_identities(root: &Path) -> Vec<(String, u32, String)> {
    let mut identities = RegistryStore::read(&root.join("registry.json"))
        .ok()
        .flatten()
        .map(|registry| {
            registry
                .tabs
                .into_iter()
                .filter_map(|tab| Some((tab.tab_id, tab.holder_pid?, tab.holder_start_identity?)))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    identities.sort();
    identities
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
fn crash_roles(root: &Path) -> std::collections::HashSet<String> {
    let Ok(entries) = std::fs::read_dir(root) else {
        return std::collections::HashSet::new();
    };
    entries
        .flatten()
        .filter_map(|entry| std::fs::read_to_string(entry.path()).ok())
        .filter_map(|record| {
            serde_json::from_str::<serde_json::Value>(&record)
                .ok()
                .and_then(|value| value["role"].as_str().map(str::to_owned))
        })
        .collect()
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
