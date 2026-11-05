use super::*;
use terminal_host_contracts::roles::{
    wire,
    workspace::{WorkspaceStore, WorkspaceTab},
};

#[test]
fn activation_inspects_busy_agents_without_writing_and_restart_preserves_pending_input() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    std::fs::write(a.release.join("bin/ui.js"), r#"
if(process.stdin.isTTY)process.stdin.setRawMode(true);
let pending='', ticks=0;
process.stdout.write('READY\r\n');
process.stdin.on('data',b=>{for(const c of b.toString()){if(c==='\r'){process.stdout.write('COMMITTED:'+pending+'\r\n');pending='';}else{pending+=c;process.stdout.write('PENDING:'+pending+'\r\n');}}});
setInterval(()=>process.stdout.write('PROGRESS:'+ ++ticks+'\r\n'),100);
"#).unwrap();
    a.call(&["server", "--detach"]);
    a.create();
    let original_child = a.wait_child();
    let id = WorkspaceTab::id_for(
        &scope::fixture_token(&a.profile, &a.executable).unwrap(),
        "tab-1",
    );
    let mut client = WorkspaceClient::open(&a);
    client.next("welcome");
    client.next("attached");
    wire::send(
        &mut client.stream,
        "attach.start",
        None,
        serde_json::json!({
            "clientId":"fixture", "cwd":a.release, "columns":80,"rows":23,
            "releaseRoot":a.release,"nodeExecutable":"node","environment":[],
        }),
    )
    .unwrap();
    client.wait_text(&id, "READY");
    wire::send(
        &mut client.stream,
        "input",
        None,
        wire::Input {
            bytes: b"unfinished".to_vec(),
            paste: false,
            epoch: 0,
        },
    )
    .unwrap();
    client.wait_text(&id, "PENDING:unfinished");
    b.call(&["server", "--detach"]);
    let before = RegistryStore::read(&a.state().join("registry.json"))
        .unwrap()
        .unwrap();
    // Rationale: a healthy viewer can hold this lease beyond the check deadline. Readiness
    // must inspect the committed generation, not wait for a writer or manufacture a new epoch.
    let deadline = Instant::now() + Duration::from_secs(5);
    let held = loop {
        match WorkspaceStore::open(&a.profile, &a.data) {
            Ok(store) => break store,
            Err(error)
                if error == "workspace writer lease is held" && Instant::now() < deadline =>
            {
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(error) => panic!("{error}"),
        }
    };
    let document = held.snapshot().clone();
    let arguments = [
        "workspace-check",
        "--release-root",
        b.release.to_str().unwrap(),
    ];
    let report = b.call(&arguments);
    assert_eq!(report["compatible"], true);
    assert_eq!(b.call(&arguments)["fingerprint"], report["fingerprint"]);
    assert_eq!(
        WorkspaceStore::inspect(&a.profile, &a.data).unwrap(),
        Some(document)
    );
    client.wait_text(&id, "PROGRESS:");
    drop(held);
    drop(client);
    let mut restarted = WorkspaceClient::open(&b);
    restarted.next("welcome");
    let (_, admission): (_, terminal_host_contracts::protocol::BridgeAttachment) =
        wire::body(&restarted.next("attached")).unwrap();
    assert_eq!(admission.selected_tab.as_deref(), Some(id.as_str()));
    assert_eq!(
        admission
            .initial_tabs
            .unwrap()
            .tabs
            .iter()
            .map(|tab| tab.tab_id.as_str())
            .collect::<Vec<_>>(),
        [&id]
    );
    wire::send(
        &mut restarted.stream,
        "attach.start",
        None,
        serde_json::json!({
            "clientId":"fixture", "cwd":b.release, "columns":80,"rows":23,
            "releaseRoot":b.release,"nodeExecutable":"node","environment":[],
        }),
    )
    .unwrap();
    restarted.wait_text(&id, "PROGRESS:");
    wire::send(
        &mut restarted.stream,
        "input",
        None,
        wire::Input {
            bytes: b"\r".to_vec(),
            paste: false,
            epoch: 0,
        },
    )
    .unwrap();
    restarted.wait_text(&id, "COMMITTED:unfinished");
    restarted.wait_text(&id, "PROGRESS:");
    assert_eq!(a.wait_child(), original_child);
    let after = RegistryStore::read(&a.state().join("registry.json"))
        .unwrap()
        .unwrap();
    assert_eq!(after.tabs[0].holder_pid, before.tabs[0].holder_pid);
    assert_eq!(
        after.tabs[0].holder_start_identity,
        before.tabs[0].holder_start_identity
    );
    assert_eq!(after.tabs[0].incarnation, before.tabs[0].incarnation);
    assert_eq!(after.tabs[0].session_file, before.tabs[0].session_file);
}
