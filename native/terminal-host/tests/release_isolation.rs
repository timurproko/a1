#![cfg(feature = "resident-fixtures")]

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use terminal_host_contracts::roles::{registry::RegistryStore, scope};

struct Host {
    executable: PathBuf,
    profile: PathBuf,
    data: PathBuf,
    runtime: PathBuf,
    release: PathBuf,
}

impl Host {
    fn command(&self, args: &[&str]) -> Command {
        let mut command = Command::new(&self.executable);
        command
            .args(args)
            .args([
                "--profile",
                self.profile.to_str().unwrap(),
                "--data-dir",
                self.data.to_str().unwrap(),
                "--runtime-dir",
                self.runtime.to_str().unwrap(),
            ])
            .env_remove("A1_TABS_ENDPOINT");
        command
    }
    fn call(&self, args: &[&str]) -> serde_json::Value {
        let output = self.command(args).output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        serde_json::from_slice(&output.stdout).unwrap()
    }
    fn state(&self) -> PathBuf {
        self.data
            .join("tabs")
            .join(scope::fixture_token(&self.profile, &self.executable).unwrap())
    }
    fn marker(&self) -> serde_json::Value {
        serde_json::from_slice(&std::fs::read(self.state().join("server.json")).unwrap()).unwrap()
    }
    fn create(&self) {
        use terminal_host_contracts::roles::{credentials::ProfileCredentials, wire};
        let node = Command::new("node")
            .args(["-p", "process.execPath"])
            .output()
            .unwrap();
        let node = String::from_utf8(node.stdout).unwrap();
        let credentials = ProfileCredentials::load_existing(&self.state())
            .unwrap()
            .unwrap();
        let marker = self.marker();
        let mut stream =
            terminal_host_contracts::endpoint::connect(marker["endpoint"].as_str().unwrap())
                .unwrap();
        wire::send(
            &mut stream,
            "hello",
            Some(1),
            serde_json::json!({
                "role": "internal", "generation": 1, "build": "fixture",
                "releaseId": scope::fixture_release_id(&self.executable).unwrap(),
                "token": credentials.client_token.to_vec(),
            }),
        )
        .unwrap();
        let mut client = String::new();
        for expected in ["welcome", "attached"] {
            let payload = wire::read_payload(&mut stream).unwrap().unwrap();
            assert_eq!(wire::kind(&payload).unwrap().message_type, expected);
            if expected == "attached" {
                let (_, body): (_, serde_json::Value) = wire::body(&payload).unwrap();
                client = body["clientId"].as_str().unwrap().into();
            }
        }
        wire::send(
            &mut stream,
            "attach.start",
            Some(2),
            serde_json::json!({
                "clientId": client, "cwd": self.release, "columns": 80, "rows": 23,
                "releaseRoot": self.release, "nodeExecutable": node.trim(), "environment": std::env::vars().collect::<Vec<_>>(),
            }),
        )
        .unwrap();
        self.wait_child();
        let list = self.call(&["tabs", "list"]);
        assert_eq!(list["result"]["tabs"][0]["tabId"], "tab-1");
    }
    fn wait_child(&self) -> (u32, String) {
        let deadline = Instant::now() + Duration::from_secs(15);
        while Instant::now() < deadline {
            if let Ok(Some(registry)) = RegistryStore::read(&self.state().join("registry.json")) {
                if let Some(tab) = registry.tabs.iter().find(|tab| tab.tab_id == "tab-1" && tab.kind == "agent" && tab.child_pid.is_some()) {
                    assert_eq!(
                        std::fs::canonicalize(&tab.release).unwrap(),
                        std::fs::canonicalize(&self.release).unwrap()
                    );
                    return (
                        tab.child_pid.unwrap(),
                        tab.child_start_identity.clone().unwrap(),
                    );
                }
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        panic!("fixture child did not become live");
    }
}
impl Drop for Host {
    fn drop(&mut self) {
        let _ = self.command(&["tabs", "host-stop"]).output();
    }
}

fn hosts(root: &Path) -> (Host, Host) {
    let profile = root.join("profile");
    let data = root.join("data");
    let runtime = root.join("runtime");
    for path in [&profile, &data, &runtime] {
        std::fs::create_dir_all(path).unwrap();
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&runtime, std::fs::Permissions::from_mode(0o700)).unwrap();
    }
    let make = |id: &str| {
        let release = root.join(id);
        std::fs::create_dir_all(release.join("bin")).unwrap();
        std::fs::write(
            release.join("bin/ui.js"),
            "process.stdout.write('ready\\r\\n');setInterval(()=>process.stdout.write('.'),30);\n",
        )
        .unwrap();
        let executable = release.join(if cfg!(windows) { "host.exe" } else { "host" });
        std::fs::copy(env!("CARGO_BIN_EXE_role-host"), &executable).unwrap();
        Host {
            executable,
            profile: profile.clone(),
            data: data.clone(),
            runtime: runtime.clone(),
            release,
        }
    };
    (
        make("same-version-payload-a"),
        make("same-version-payload-b"),
    )
}

#[test]
fn release_isolation_preserves_old_work_recovery_and_maintenance_boundaries() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    let legacy = a
        .data
        .join("tabs")
        .join(terminal_host_contracts::endpoint::endpoint_token(&a.profile).unwrap());
    std::fs::create_dir_all(&legacy).unwrap();
    std::fs::write(legacy.join("registry.json"), b"legacy sentinel").unwrap();
    let legacy_gate = a.runtime.join("server-start.lock");
    std::fs::write(&legacy_gate, b"legacy start gate").unwrap();
    let _legacy_lock =
        terminal_host_contracts::session_lock::SessionLock::acquire_location(&legacy_gate).unwrap();
    a.call(&["server", "--detach"]);
    let original = a.marker();
    assert_eq!(
        a.call(&["server", "--detach"])["outcome"],
        "already-running"
    );
    a.create();
    let child = a.wait_child();
    b.call(&["server", "--detach"]);
    b.create();
    b.wait_child();
    assert_ne!(a.state(), b.state());
    assert_ne!(a.marker()["endpoint"], b.marker()["endpoint"]);
    assert_ne!(a.marker()["pid"], b.marker()["pid"]);
    assert_eq!(original["pid"], a.marker()["pid"]);
    assert_eq!(child, a.wait_child(), "{:?}", RegistryStore::read(&a.state().join("registry.json")));
    assert_eq!(
        std::fs::read(legacy.join("registry.json")).unwrap(),
        b"legacy sentinel"
    );

    let wrong = b
        .command(&[
            "probe",
            "--endpoint",
            a.marker()["endpoint"].as_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        !wrong.status.success(),
        "a same-generation different release must refuse admission"
    );
    assert_eq!(original["pid"], a.marker()["pid"]);
    let holds = a.call(&["release-holds"]);
    assert_eq!(
        holds["complete"], false,
        "legacy unreadability must retain every release"
    );
    let roots = holds["releaseRoots"].as_array().unwrap();
    for host in [&a, &b] {
        assert!(
            roots
                .iter()
                .any(|value| std::fs::canonicalize(value.as_str().unwrap()).ok()
                    == Some(std::fs::canonicalize(&host.release).unwrap()))
        );
    }

    let b_before = b.marker();
    let a_owner: terminal_host_contracts::identity::ProcessIdentity =
        terminal_host_contracts::identity::ProcessIdentity {
            pid: original["pid"].as_u64().unwrap() as u32,
            start: original["startIdentity"].as_str().unwrap().into(),
        };
    std::fs::write(
        a.data.join("release-state.json"),
        br#"{"references":{"active":"same-version-payload-b"}}"#,
    )
    .unwrap();
    terminal_host_contracts::identity::terminate_verified(
        &a_owner,
        Duration::from_secs(2),
        Duration::from_secs(2),
    )
    .unwrap();
    a.call(&["server", "--detach"]);
    assert_ne!(a.marker()["pid"], original["pid"]);
    assert_eq!(child, a.wait_child());
    assert_eq!(b_before["pid"], b.marker()["pid"]);
    assert_eq!(
        b.call(&["tabs", "stop", "tab-1"])["result"]["accepted"],
        true
    );
    assert_eq!(a.call(&["tabs", "host-status"])["host"], "running");
    assert_eq!(b.call(&["tabs", "host-stop"])["host"], "stopped");
    assert_eq!(child, a.wait_child());
    assert_eq!(
        std::fs::read(legacy.join("registry.json")).unwrap(),
        b"legacy sentinel"
    );
}

#[test]
fn release_isolation_does_not_partition_session_writer_leases() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    for existing in [false, true] {
        let session = root.path().join(if existing {
            "existing.jsonl"
        } else {
            "new.jsonl"
        });
        if existing {
            std::fs::write(&session, b"session content").unwrap();
        }
        let mut writer = Command::new(&a.executable)
            .args(["--fixture-session-writer", session.to_str().unwrap()])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .unwrap();
        let mut ready = String::new();
        BufReader::new(writer.stdout.take().unwrap())
            .read_line(&mut ready)
            .unwrap();
        assert_eq!(ready.trim(), "writer-ready");
        let conflict = Command::new(&b.executable)
            .args(["--fixture-session-writer", session.to_str().unwrap()])
            .output()
            .unwrap();
        assert_eq!(conflict.status.code(), Some(3));
        drop(writer.stdin.take());
        assert!(writer.wait().unwrap().success());
        let resumed = Command::new(&b.executable)
            .args(["--fixture-session-writer", session.to_str().unwrap()])
            .output()
            .unwrap();
        assert!(resumed.status.success());
        if existing {
            assert_eq!(std::fs::read(&session).unwrap(), b"session content");
        }
    }
}
