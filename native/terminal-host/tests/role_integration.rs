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
        first.output_containing(
            "1 agent still running run a1 to return.",
            Duration::from_secs(2)
        ),
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
    wait_for_holder_started_server(&executable, &profile, &data, &runtime, &address);
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
fn crashed_child_recovers_when_server_dies_after_budget_commit() {
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
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_CRASH_POINT", "after-restart-budget-commit");
    assert!(
        server
            .output()
            .expect("faulted restart server")
            .status
            .success()
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let initial_servers = server_pids(&credentials_root);
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: initial_servers.clone(),
    };
    let mut attach = AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        attach.output_containing("first-incarnation", Duration::from_secs(15)),
        "{}",
        attach.output_text()
    );
    let crash_deadline = Instant::now() + Duration::from_secs(10);
    loop {
        let registry = RegistryStore::read(&credentials_root.join("registry.json"))
            .expect("read committed restart registry")
            .expect("committed restart registry");
        if registry
            .tabs
            .first()
            .is_some_and(|tab| tab.lifecycle == "restarting" && tab.incarnation == 2)
        {
            break;
        }
        assert!(
            Instant::now() < crash_deadline,
            "restart budget was not committed before the injected crash: {registry:?}"
        );
        std::thread::sleep(Duration::from_millis(50));
    }
    std::thread::sleep(Duration::from_millis(500));
    start_server(&executable, &profile, &data, &runtime, &address);
    // Rationale: recovery may legitimately consume the server's 40-second start-gate bound
    // before the retained holder reports its replacement child on a loaded Windows runner.
    let deadline = Instant::now() + Duration::from_secs(50);
    let registry = loop {
        let registry = RegistryStore::read(&credentials_root.join("registry.json"))
            .expect("read recovery registry")
            .expect("recovery registry");
        if registry.tabs.first().is_some_and(|tab| {
            tab.lifecycle == "running" && tab.incarnation == 2 && tab.child_pid.is_some()
        }) {
            break registry;
        }
        assert!(
            Instant::now() < deadline,
            "post-commit server recovery did not converge: {registry:?}"
        );
        std::thread::sleep(Duration::from_millis(100));
    };
    let _ = attach.wait(Duration::from_secs(8));
    let mut recovered_attach =
        AttachFixture::spawn(&executable, &address, &profile, &data, &release);
    assert!(
        recovered_attach.output_containing("recovered-incarnation", Duration::from_secs(15)),
        "{}",
        recovered_attach.output_text()
    );
    let tab = registry.tabs.first().expect("recovered tab");
    assert_eq!(tab.lifecycle, "running");
    assert_eq!(tab.incarnation, 2);
    assert_eq!(tab.restarts, 1);
    assert_eq!(tab.last_exit.as_deref(), Some("exit 17"));
    let recovered_servers = server_pids(&credentials_root);
    assert_ne!(recovered_servers, initial_servers);
    cleanup.pids.extend(recovered_servers);
    recovered_attach.write(b"\x03\x03");
    recovered_attach.wait(Duration::from_secs(8));
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
        let frozen_credentials_root = frozen_data
            .join("tabs")
            .join(endpoint::endpoint_token(&frozen_profile).expect("frozen profile token"));
        roles.extend(crash_roles(&frozen_credentials_root.join("diagnostics")));
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
            .env(
                terminal_host_contracts::fault_injection::REGISTRY_REPLACE,
                mode,
            )
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

    let mut takeover = AttachFixture::spawn_view(
        &executable,
        &address,
        &profile,
        &data,
        &release,
        fake_tab,
        Some(&second_tab),
    );
    assert!(takeover.output_containing("fake-tab-ready", Duration::from_secs(10)));
    takeover.write(b"claimed-by-first-input\n");
    assert!(
        takeover.output_containing("echo:claimed-by-first-input", Duration::from_secs(10)),
        "{}",
        takeover.output_text()
    );
    second.write(b"reclaimed-by-first-input\n");
    assert!(
        second.output_containing("echo:reclaimed-by-first-input", Duration::from_secs(10)),
        "{}",
        second.output_text()
    );
    takeover.lose_launch_tree();
    takeover.wait(Duration::from_secs(8));

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
    wait_for_holder_started_server(&executable, &profile, &data, &runtime, &address);
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
    assert!(
        reattached_second
            .output_containing("echo:reclaimed-by-first-input", Duration::from_secs(15))
    );
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

/// Crash points a fresh start plus one tab always reaches; the rest need a corrupted registry,
/// an exhausted restart budget, a dying child, or an A1 bridge, which their dedicated tests set up.
const REACHED_ON_START_AND_TAB: &[&str] = &[
    "after-lease",
    "after-epoch",
    "after-marker",
    "after-bind",
    "durable-temporary-created",
    "durable-bytes-written",
    "durable-file-synchronized",
    "durable-target-replaced",
    "durable-directory-synchronized",
    "frame-before-send",
    "frame-after-send",
    "frame-after-receive",
];

#[test]
fn every_named_crash_point_recovers_to_a_clean_start_with_a_working_tab() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let fake_tab = env!("CARGO_BIN_EXE_fake-tab");
    let mut unreached = Vec::new();
    for (index, point) in terminal_host_contracts::fault_injection::CRASH_POINTS
        .iter()
        .enumerate()
    {
        // Platform: short names keep the Unix socket path under the platform's length limit.
        let profile = directory(root.path(), &format!("p{index}"));
        let data = directory(root.path(), &format!("d{index}"));
        let runtime = directory(root.path(), &format!("r{index}"));
        let marks = directory(root.path(), &format!("m{index}"));
        let release = directory(root.path(), &format!("x{index}"));
        protect_runtime(&runtime);
        let address = fixture_endpoint(&runtime);
        let credentials_root = data
            .join("tabs")
            .join(endpoint::endpoint_token(&profile).expect("profile token"));
        let mut cleanup = Cleanup {
            credentials_root: credentials_root.clone(),
            pids: Vec::new(),
        };

        // Invariant: the faulted phase may die anywhere; only what survives it is inspected.
        let mut faulted = server_command(&executable, &profile, &data, &runtime, &address);
        faulted
            .env("A1_TABS_FAULT_CRASH_POINT", point)
            .env("A1_TABS_FAULT_CRASH_MARK", &marks);
        let _ = faulted.output();
        if credentials_root.join("server.json").is_file() {
            let _ = Command::new(&executable)
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
                    fake_tab,
                ])
                .env("A1_TABS_ENDPOINT", &address)
                .current_dir(&release)
                .output();
            std::thread::sleep(Duration::from_secs(2));
        }
        if !marks.join(point).exists() {
            unreached.push(*point);
        }
        cleanup.pids.extend(server_pids(&credentials_root));
        cleanup.pids.extend(holder_pids(&credentials_root));
        drop(cleanup);

        if credentials_root.join("registry.json").is_file() {
            assert!(
                RegistryStore::recover(&credentials_root.join("registry.json")).is_ok(),
                "{point}: registry did not recover"
            );
        }
        // Invariant: an explicit restart resets the crash-loop start budget the faulted phase spent.
        let restarted = server_command(&executable, &profile, &data, &runtime, &address)
            .arg("--restart")
            .output()
            .expect("restart after crash point");
        assert!(
            restarted.status.success(),
            "{point}: clean restart failed: {}",
            String::from_utf8_lossy(&restarted.stderr)
        );
        let mut cleanup = Cleanup {
            credentials_root: credentials_root.clone(),
            pids: server_pids(&credentials_root),
        };
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
        let tab_id = serde_json::from_str::<serde_json::Value>(&created).expect("tab-create json")
            ["tabId"]
            .as_str()
            .expect("created tab id")
            .to_owned();
        let deadline = Instant::now() + Duration::from_secs(30);
        while !holder_identities(&credentials_root)
            .iter()
            .any(|(tab, _, _)| tab == &tab_id)
        {
            assert!(
                Instant::now() < deadline,
                "{point}: a clean start did not run a tab"
            );
            std::thread::sleep(Duration::from_millis(100));
        }
        cleanup.pids.extend(holder_pids(&credentials_root));
    }
    let required_but_unreached = unreached
        .iter()
        .filter(|point| REACHED_ON_START_AND_TAB.contains(point))
        .collect::<Vec<_>>();
    assert!(
        required_but_unreached.is_empty(),
        "crash points were never hit: {required_but_unreached:?}"
    );
}
#[test]
fn maintenance_lists_stops_reports_and_stops_the_host_without_starting_one() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let release = directory(root.path(), "release");
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let fake_tab = env!("CARGO_BIN_EXE_fake-tab");

    // Invariant: with no host ever run, every read-only form reports none and creates nothing.
    let none = tabs(&executable, &["list"], &profile, &data, &runtime, &address);
    assert_eq!(none.0, 0);
    assert_eq!(none.1["host"], "none");
    assert!(
        !data.join("tabs").exists(),
        "maintenance created resident state"
    );

    start_server(&executable, &profile, &data, &runtime, &address);
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    let mut tab_ids = Vec::new();
    for _ in 0..2 {
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
        tab_ids.push(
            serde_json::from_str::<serde_json::Value>(&created).expect("tab-create json")["tabId"]
                .as_str()
                .expect("created tab id")
                .to_owned(),
        );
    }
    let deadline = Instant::now() + Duration::from_secs(30);
    while holder_pids(&credentials_root).len() < 2 {
        assert!(Instant::now() < deadline, "holders did not start");
        std::thread::sleep(Duration::from_millis(100));
    }
    cleanup.pids.extend(holder_pids(&credentials_root));

    let listed = tabs(&executable, &["list"], &profile, &data, &runtime, &address);
    assert_eq!(listed.0, 0, "{}", listed.1);
    assert_eq!(listed.1["host"], "running");
    let entries = listed.1["result"]["tabs"].as_array().expect("tab list");
    assert_eq!(entries.len(), 2);
    assert!(entries.iter().all(|tab| tab["release"] == text(&release)));
    assert!(
        entries
            .iter()
            .all(|tab| tab["holderPid"].as_u64().is_some())
    );

    let status = tabs(
        &executable,
        &["host-status"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(status.0, 0, "{}", status.1);
    assert_eq!(status.1["result"]["tabs"], 2);
    assert_eq!(status.1["result"]["generation"], 1);
    assert!(status.1["result"]["counters"]["crashRestarts"].is_u64());
    assert!(status.1["result"]["limits"]["tabsMaxHard"].is_u64());

    let unknown = tabs(
        &executable,
        &["stop", "tab-missing"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(unknown.0, 3);
    assert_eq!(unknown.1["result"]["accepted"], false);

    let first_holder = holder_identities(&credentials_root)
        .into_iter()
        .find(|(tab, _, _)| tab == &tab_ids[0])
        .expect("first holder");
    let stopped = tabs(
        &executable,
        &["stop", &tab_ids[0]],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(stopped.0, 0, "{}", stopped.1);
    assert_eq!(stopped.1["result"]["stopped"][0], tab_ids[0].as_str());
    let registry = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read registry")
        .expect("registry");
    assert!(registry.tabs.iter().all(|tab| tab.tab_id != tab_ids[0]));
    assert!(registry.tabs.iter().any(|tab| tab.tab_id == tab_ids[1]));
    assert!(
        terminal_host_contracts::identity::inspect_process(first_holder.1)
            .expect("inspect stopped holder")
            .is_none_or(|observed| observed.start != first_holder.2),
        "stopped holder survived"
    );

    let host = tabs(
        &executable,
        &["host-stop"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(host.0, 0, "{}", host.1);
    assert_eq!(host.1["host"], "stopped");
    let deadline = Instant::now() + Duration::from_secs(15);
    while credentials_root.join("server.json").exists() {
        assert!(
            Instant::now() < deadline,
            "server did not exit and remove its marker"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    let after = tabs(&executable, &["list"], &profile, &data, &runtime, &address);
    assert_eq!(after.0, 0);
    assert_eq!(after.1["host"], "none");
    assert!(
        !credentials_root.join("server.json").exists(),
        "listing started a host"
    );
}

#[test]
fn maintenance_stop_terminates_a_hung_holder_only_by_its_verified_identity() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    let release = directory(root.path(), "release");
    protect_runtime(&runtime);
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_FREEZE_ROLE", "holder");
    assert!(
        server
            .output()
            .expect("hung-holder server")
            .status
            .success()
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let mut cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
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
            env!("CARGO_BIN_EXE_fake-tab"),
        ],
    );
    let tab_id =
        serde_json::from_str::<serde_json::Value>(&created).expect("tab-create json")["tabId"]
            .as_str()
            .expect("created tab id")
            .to_owned();
    let deadline = Instant::now() + Duration::from_secs(30);
    let holder = loop {
        if let Some(found) = holder_identities(&credentials_root)
            .into_iter()
            .find(|(tab, _, _)| tab == &tab_id)
        {
            break found;
        }
        assert!(Instant::now() < deadline, "hung holder never registered");
        std::thread::sleep(Duration::from_millis(100));
    };
    cleanup.pids.push(holder.1);

    let stopped = tabs(
        &executable,
        &["stop", &tab_id],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(stopped.0, 0, "{}", stopped.1);
    assert_eq!(stopped.1["result"]["accepted"], true);
    assert!(
        terminal_host_contracts::identity::inspect_process(holder.1)
            .expect("inspect hung holder")
            .is_none_or(|observed| observed.start != holder.2),
        "hung holder survived its stop"
    );
}

#[test]
fn maintenance_stops_a_streaming_tab_and_keeps_its_session_on_disk() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    let release = directory(root.path(), "release");
    let sessions = directory(root.path(), "sessions");
    let session = sessions.join("session.jsonl");
    std::fs::write(&session, b"{\"type\":\"session\"}\n").expect("seed session");
    protect_runtime(&runtime);
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
    let created = Command::new(&executable)
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
            "--session-dir",
            text(&sessions),
            "--node-executable",
            env!("CARGO_BIN_EXE_fake-tab"),
        ])
        .env("A1_TABS_ENDPOINT", &address)
        .env("TERMINAL_HOST_FAKE_TAB_MODE", "stream")
        .env("TERMINAL_HOST_FAKE_TAB_STREAM_BYTES", "4096")
        .current_dir(&release)
        .output()
        .expect("create streaming tab");
    assert!(
        created.status.success(),
        "{}",
        String::from_utf8_lossy(&created.stderr)
    );
    let tab_id = serde_json::from_slice::<serde_json::Value>(&created.stdout)
        .expect("tab-create json")["tabId"]
        .as_str()
        .expect("created tab id")
        .to_owned();
    let deadline = Instant::now() + Duration::from_secs(30);
    let holder = loop {
        let registry = RegistryStore::read(&credentials_root.join("registry.json"))
            .ok()
            .flatten();
        let running = registry.as_ref().and_then(|registry| {
            registry
                .tabs
                .iter()
                .find(|tab| tab.tab_id == tab_id && tab.child_pid.is_some())
                .and_then(|tab| Some((tab.holder_pid?, tab.holder_start_identity.clone()?)))
        });
        if let Some(found) = running {
            break found;
        }
        assert!(Instant::now() < deadline, "streaming tab never started");
        std::thread::sleep(Duration::from_millis(100));
    };
    cleanup.pids.push(holder.0);
    // Invariant: the agent is busy streaming output when the stop arrives.
    std::thread::sleep(Duration::from_millis(500));

    let stopped = tabs(
        &executable,
        &["stop", &tab_id],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(stopped.0, 0, "{}", stopped.1);
    assert_eq!(stopped.1["result"]["accepted"], true);
    assert_eq!(stopped.1["result"]["stopped"][0], tab_id.as_str());
    assert!(
        terminal_host_contracts::identity::inspect_process(holder.0)
            .expect("inspect stopped holder")
            .is_none_or(|observed| observed.start != holder.1),
        "streaming holder survived its stop"
    );
    let registry = RegistryStore::read(&credentials_root.join("registry.json"))
        .expect("read registry")
        .expect("registry");
    assert!(registry.tabs.iter().all(|tab| tab.tab_id != tab_id));
    // Invariant: stopping releases the tab, never its session, so it stays resumable.
    assert_eq!(
        std::fs::read(&session).expect("session kept"),
        b"{\"type\":\"session\"}\n"
    );
}

#[test]
fn host_stop_terminates_an_unresponsive_server_and_stops_its_tabs() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    let release = directory(root.path(), "release");
    protect_runtime(&runtime);
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
            env!("CARGO_BIN_EXE_fake-tab"),
        ],
    );
    let tab_id =
        serde_json::from_str::<serde_json::Value>(&created).expect("tab-create json")["tabId"]
            .as_str()
            .expect("created tab id")
            .to_owned();
    let deadline = Instant::now() + Duration::from_secs(30);
    let holder = loop {
        if let Some(found) = holder_identities(&credentials_root)
            .into_iter()
            .find(|(tab, _, _)| tab == &tab_id)
        {
            break found;
        }
        assert!(Instant::now() < deadline, "holder never registered");
        std::thread::sleep(Duration::from_millis(100));
    };
    cleanup.pids.push(holder.1);
    let server = server_pids(&credentials_root)[0];
    let server_identity = terminal_host_contracts::identity::inspect_process(server)
        .expect("inspect server")
        .expect("live server");

    // A suspended server keeps its endpoint and holder connections but never answers.
    suspend(server);
    let stopped = tabs(
        &executable,
        &["host-stop"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(stopped.0, 0, "{}", stopped.1);
    assert_eq!(stopped.1["host"], "stopped");
    assert_eq!(stopped.1["terminatedUnresponsive"], server);
    assert!(
        terminal_host_contracts::identity::inspect_process(server)
            .expect("inspect stopped server")
            .is_none_or(|observed| observed != server_identity),
        "unresponsive server survived"
    );
    let deadline = Instant::now() + Duration::from_secs(30);
    loop {
        let holder_gone = terminal_host_contracts::identity::inspect_process(holder.1)
            .expect("inspect holder")
            .is_none_or(|observed| observed.start != holder.2);
        if holder_gone && server_pids(&credentials_root).is_empty() {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "the replacement did not stop the tab and exit"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    // Invariant: the tab was stopped, not restarted, and nothing is left running afterwards.
    let after = tabs(&executable, &["list"], &profile, &data, &runtime, &address);
    assert_eq!(after.1["host"], "none", "{}", after.1);
}

#[test]
fn a_server_of_another_generation_is_reported_incompatible_and_never_signalled() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    let mut server = server_command(&executable, &profile, &data, &runtime, &address);
    server.env("A1_TABS_FAULT_SERVER_GENERATION", "2");
    let started = server.output().expect("other-generation server");
    assert!(
        started.status.success(),
        "{}",
        String::from_utf8_lossy(&started.stderr)
    );
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let _cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    let server_pid = server_pids(&credentials_root)[0];
    let server_identity = terminal_host_contracts::identity::inspect_process(server_pid)
        .expect("inspect server")
        .expect("live server");

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
        .env("A1_TABS_ENDPOINT", &address)
        .output()
        .expect("probe");
    assert!(!probe.status.success());
    assert!(
        String::from_utf8_lossy(&probe.stdout).contains("incompatible-generation"),
        "{}",
        String::from_utf8_lossy(&probe.stdout)
    );
    for command in [&["list"][..], &["host-status"], &["host-stop"]] {
        let answer = tabs(&executable, command, &profile, &data, &runtime, &address);
        assert_eq!(answer.0, 4, "{command:?}: {}", answer.1);
        assert_eq!(answer.1["host"], "incompatible", "{command:?}");
    }
    // Invariant: a mismatched generation is reported with a stop instruction, never signalled.
    assert_eq!(
        terminal_host_contracts::identity::inspect_process(server_pid).expect("inspect server"),
        Some(server_identity)
    );
}

#[test]
fn host_stop_refuses_an_unverifiable_owner_and_changes_nothing() {
    let _serial = serialize_role_fixture();
    let root = tempfile::tempdir().expect("fixture root");
    let profile = directory(root.path(), "profile");
    let data = directory(root.path(), "data");
    let runtime = directory(root.path(), "runtime");
    protect_runtime(&runtime);
    let address = fixture_endpoint(&runtime);
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_terminal-host"));
    start_server(&executable, &profile, &data, &runtime, &address);
    let credentials_root = data
        .join("tabs")
        .join(endpoint::endpoint_token(&profile).expect("profile token"));
    let _cleanup = Cleanup {
        credentials_root: credentials_root.clone(),
        pids: server_pids(&credentials_root),
    };
    let stopped = tabs(
        &executable,
        &["host-stop"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(stopped.0, 0, "{}", stopped.1);
    let deadline = Instant::now() + Duration::from_secs(15);
    while credentials_root.join("server.json").exists() {
        assert!(Instant::now() < deadline, "server did not exit");
        std::thread::sleep(Duration::from_millis(100));
    }

    // An unreadable owner marker cannot be verified, so the stop refuses and leaves it in place.
    std::fs::write(credentials_root.join("server.json"), b"{not json").expect("write marker");
    let refused = tabs(
        &executable,
        &["host-stop"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(refused.0, 3, "{}", refused.1);
    assert_eq!(refused.1["host"], "unverifiable");
    assert_eq!(
        std::fs::read(credentials_root.join("server.json")).expect("marker kept"),
        b"{not json"
    );

    // A marker naming a live process under another start identity is pid reuse: nothing is signalled.
    let own = terminal_host_contracts::identity::inspect_process(std::process::id())
        .expect("inspect test process")
        .expect("live test process");
    std::fs::write(
        credentials_root.join("server.json"),
        serde_json::to_vec(&serde_json::json!({
            "pid": own.pid,
            "startIdentity": format!("{}-reused", own.start),
            "endpoint": address,
            "generation": 1,
            "verified": true,
            "detachmentMode": "fixture",
        }))
        .expect("marker json"),
    )
    .expect("write reused marker");
    let reused = tabs(
        &executable,
        &["host-stop"],
        &profile,
        &data,
        &runtime,
        &address,
    );
    assert_eq!(reused.0, 0, "{}", reused.1);
    assert_eq!(reused.1["host"], "none");
    // Invariant: teardown signals marker pids, and this marker names the test process itself.
    std::fs::remove_file(credentials_root.join("server.json")).expect("remove reused marker");
}

#[cfg(unix)]
fn suspend(pid: u32) {
    unsafe {
        libc::kill(pid as i32, libc::SIGSTOP);
    }
}
#[cfg(windows)]
fn suspend(pid: u32) {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next,
    };
    use windows_sys::Win32::System::Threading::{OpenThread, SuspendThread, THREAD_SUSPEND_RESUME};
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    assert!(snapshot != INVALID_HANDLE_VALUE, "thread snapshot");
    let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
    entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;
    let mut more = unsafe { Thread32First(snapshot, &mut entry) } != 0;
    while more {
        if entry.th32OwnerProcessID == pid {
            let thread = unsafe { OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID) };
            if !thread.is_null() {
                unsafe {
                    SuspendThread(thread);
                    CloseHandle(thread);
                }
            }
        }
        more = unsafe { Thread32Next(snapshot, &mut entry) } != 0;
    }
    unsafe {
        CloseHandle(snapshot);
    }
}
fn tabs(
    executable: &Path,
    command: &[&str],
    profile: &Path,
    data: &Path,
    runtime: &Path,
    address: &str,
) -> (i32, serde_json::Value) {
    let output = Command::new(executable)
        .arg("tabs")
        .args(command)
        .args([
            "--profile",
            text(profile),
            "--data-dir",
            text(data),
            "--runtime-dir",
            text(runtime),
        ])
        .env("A1_TABS_ENDPOINT", address)
        .output()
        .expect("run tabs maintenance");
    let stdout = String::from_utf8_lossy(&output.stdout);
    let report =
        serde_json::from_str(stdout.trim().lines().last().unwrap_or("")).unwrap_or_else(|_| {
            panic!(
                "no maintenance report: {stdout} {}",
                String::from_utf8_lossy(&output.stderr)
            )
        });
    (output.status.code().unwrap_or(-1), report)
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

fn wait_for_holder_started_server(
    executable: &Path,
    profile: &Path,
    data: &Path,
    runtime: &Path,
    address: &str,
) {
    let deadline = Instant::now() + Duration::from_secs(40);
    loop {
        let probe = Command::new(executable)
            .args([
                "probe",
                "--profile",
                text(profile),
                "--data-dir",
                text(data),
                "--runtime-dir",
                text(runtime),
            ])
            .env("A1_TABS_ENDPOINT", address)
            .output()
            .expect("probe holder-started server");
        if probe.status.success() {
            return;
        }
        let diagnostic = String::from_utf8_lossy(&probe.stderr);
        assert!(
            Instant::now() < deadline,
            "holders did not start a replacement server: {diagnostic}"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
}

fn server_pids(root: &Path) -> Vec<u32> {
    // Invariant: a cleanly stopped server removes its marker, leaving nothing to collect.
    let Ok(marker) = std::fs::read(root.join("server.json")) else {
        return Vec::new();
    };
    serde_json::from_slice::<serde_json::Value>(&marker)
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
#[cfg(windows)]
fn fixture_terminal_host_pids() -> Vec<u32> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW,
    };

    fn normalized(value: &str) -> String {
        value
            .strip_prefix(r"\\?\")
            .unwrap_or(value)
            .replace('/', r"\")
            .to_ascii_lowercase()
    }

    let expected = normalized(env!("CARGO_BIN_EXE_terminal-host"));
    let mut matches = Vec::new();
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot.is_null() || snapshot == -1_isize as _ {
            return matches;
        }
        let mut entry = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let process =
                    OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, entry.th32ProcessID);
                if !process.is_null() {
                    let mut buffer = [0u16; 32_768];
                    let mut length = buffer.len() as u32;
                    if QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length) != 0
                    {
                        let path = OsString::from_wide(&buffer[..length as usize])
                            .to_string_lossy()
                            .into_owned();
                        if normalized(&path) == expected {
                            matches.push(entry.th32ProcessID);
                        }
                    }
                    CloseHandle(process);
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
    }
    matches
}
#[cfg(not(windows))]
fn fixture_terminal_host_pids() -> Vec<u32> {
    Vec::new()
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
        // Concurrency: teardown reconciles because killing only a server makes holders replace it,
        // while killing only a holder makes the server replace that holder. Signal the observed
        // set as one batch, wait for exact identities, then rescan until no replacement remains.
        let replacement_deadline = Instant::now() + Duration::from_secs(5);
        loop {
            self.pids.extend(server_pids(&self.credentials_root));
            self.pids.extend(holder_pids(&self.credentials_root));
            self.pids.extend(fixture_terminal_host_pids());
            self.pids.sort_unstable();
            self.pids.dedup();
            let batch = std::mem::take(&mut self.pids);
            terminate_batch(&batch);
            if Instant::now() >= replacement_deadline {
                return;
            }
            // Concurrency: a holder may already have started a synchronous server launch. The
            // launch contract has a four-second deadline, so keep rescanning past that deadline
            // even while registry identities are briefly absent.
            std::thread::sleep(Duration::from_millis(250));
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
fn terminate(pid: u32) {
    terminate_batch(&[pid]);
}

fn terminate_batch(pids: &[u32]) {
    let expected = pids
        .iter()
        .filter_map(|pid| {
            terminal_host_contracts::identity::inspect_process(*pid)
                .ok()
                .flatten()
        })
        .collect::<Vec<_>>();
    for identity in &expected {
        signal_terminate(identity.pid);
    }
    for identity in expected {
        wait_for_terminated_identity(Some(identity));
    }
}

#[cfg(unix)]
fn signal_terminate(pid: u32) {
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
}
#[cfg(windows)]
fn signal_terminate(pid: u32) {
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

fn wait_for_terminated_identity(
    expected: Option<terminal_host_contracts::identity::ProcessIdentity>,
) {
    let Some(expected) = expected else { return };
    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline
        && terminal_host_contracts::identity::inspect_process(expected.pid)
            .ok()
            .flatten()
            .as_ref()
            == Some(&expected)
    {
        std::thread::sleep(Duration::from_millis(25));
    }
}
