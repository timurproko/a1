use super::*;
use terminal_host_contracts::{
    identity,
    roles::{wire, workspace::WorkspaceTab},
};

#[test]
fn recovered_originating_coordinator_keeps_live_view_input_and_agent_custody() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    std::fs::write(a.release.join("bin/ui.js"), "if(process.stdin.isTTY)process.stdin.setRawMode(true);let draft='';process.stdin.on('data',b=>{draft+=b.toString();process.stdout.write('DRAFT:'+draft+'\\r\\n')});process.stdout.write('ORIGINAL\\r\\n');setInterval(()=>{},1000);").unwrap();
    a.call(&["server", "--detach"]);
    a.create();
    let child = a.wait_child();
    let before = RegistryStore::read(&a.state().join("registry.json"))
        .unwrap()
        .unwrap();
    let owner = identity::inspect_process(a.marker()["pid"].as_u64().unwrap() as u32)
        .unwrap()
        .unwrap();
    b.call(&["server", "--detach"]);
    let qualified = WorkspaceTab::id_for(
        &scope::fixture_token(&a.profile, &a.executable).unwrap(),
        "tab-1",
    );
    let mut client = WorkspaceClient::open(&b);
    client.next("welcome");
    client.next("attached");
    // Protocol: attach already consumed source view generation 1; explicit views advance it.
    wire::send(
        &mut client.stream,
        "tab.view",
        None,
        wire::ViewTarget {
            tab_id: qualified.clone(),
            request_generation: 2,
            resize: None,
        },
    )
    .unwrap();
    wait_view_text(&mut client, &qualified, 2, "ORIGINAL");
    wire::send(
        &mut client.stream,
        "input",
        None,
        wire::Input {
            bytes: b"before".to_vec(),
            paste: false,
            epoch: 0,
        },
    )
    .unwrap();
    wait_view_text(&mut client, &qualified, 2, "DRAFT:before");
    // Invariant: terminate only the verified fixture coordinator, never its holder or Agent.
    identity::terminate_verified(&owner, Duration::from_secs(1), Duration::from_secs(1)).unwrap();
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        let marker = a.marker();
        if marker["pid"].as_u64() != Some(owner.pid as u64) && marker["verified"] == true {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "originating coordinator did not recover"
        );
        std::thread::sleep(Duration::from_millis(25));
    }
    wire::send(
        &mut client.stream,
        "tab.view",
        None,
        wire::ViewTarget {
            tab_id: qualified.clone(),
            request_generation: 3,
            resize: None,
        },
    )
    .unwrap();
    wait_view_text(&mut client, &qualified, 3, "DRAFT:before");
    wire::send(
        &mut client.stream,
        "input",
        None,
        wire::Input {
            bytes: b"-after".to_vec(),
            paste: false,
            epoch: 0,
        },
    )
    .unwrap();
    wait_view_text(&mut client, &qualified, 3, "DRAFT:before-after");
    let after = RegistryStore::read(&a.state().join("registry.json"))
        .unwrap()
        .unwrap();
    assert!(after.epoch > before.epoch);
    let old = &before.tabs[0];
    let current = &after.tabs[0];
    assert_eq!(
        (
            &current.tab_id,
            current.incarnation,
            current.holder_pid,
            &current.holder_start_identity,
            current.child_pid,
            &current.child_start_identity,
            &current.session_file
        ),
        (
            &old.tab_id,
            old.incarnation,
            old.holder_pid,
            &old.holder_start_identity,
            old.child_pid,
            &old.child_start_identity,
            &old.session_file
        )
    );
    assert_eq!(a.wait_child(), child);
    drop(client);
    let mut reopened = WorkspaceClient::open(&b);
    reopened.next("welcome");
    reopened.next("attached");
    wait_view_text(&mut reopened, &qualified, 1, "DRAFT:before-after");
    assert_eq!(a.wait_child(), child);
}

fn wait_view_text(client: &mut WorkspaceClient, id: &str, generation: u64, expected: &str) {
    for _ in 0..64 {
        let (_, surface): (_, wire::Surface) = wire::body(&client.next("surface")).unwrap();
        if surface.tab_id != id || surface.request_generation != generation {
            continue;
        }
        let text = surface
            .structured
            .as_ref()
            .map(|state| {
                state
                    .row_data
                    .iter()
                    .flat_map(|row| row.cells.iter().map(|cell| cell.text.as_str()))
                    .collect::<String>()
            })
            .unwrap_or_else(|| String::from_utf8_lossy(&surface.bytes).into_owned());
        if text.contains(expected) {
            return;
        }
    }
    panic!("workspace did not restore tab {id}, view {generation}, expected {expected:?}");
}
