#![cfg(feature = "resident-fixtures")]

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::{Duration, Instant};
use terminal_host_contracts::roles::{registry::RegistryStore, scope};

struct Host {
    executable: PathBuf,
    profile: PathBuf,
    data: PathBuf,
    runtime: PathBuf,
    _runtime_owner: Arc<tempfile::TempDir>,
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

fn fixture_runtime() -> tempfile::TempDir {
    // Platform: Darwin's canonical per-user temp root can exhaust the socket budget before its suffix.
    #[cfg(unix)]
    let runtime = {
        use std::os::unix::fs::PermissionsExt;
        // Security: create owner-private storage without a chmod window or reliance on the umask.
        tempfile::Builder::new()
            .prefix("rt-")
            .permissions(std::fs::Permissions::from_mode(0o700))
            .tempdir_in("/tmp")
            .unwrap()
    };
    #[cfg(not(unix))]
    let runtime = tempfile::tempdir().unwrap();
    runtime
}

fn hosts(root: &Path) -> (Host, Host) {
    let profile = root.join("profile");
    let data = root.join("data");
    let runtime_owner = Arc::new(fixture_runtime());
    let runtime = runtime_owner.path().to_path_buf();
    for path in [&profile, &data, &runtime] {
        std::fs::create_dir_all(path).unwrap();
    }
    #[cfg(unix)]
    {
        let longest = std::fs::canonicalize(&runtime)
            .unwrap()
            .join("a1-tabs-00000000000000000000.sock");
        assert!(
            longest.as_os_str().len() < 96,
            "fixture default endpoint exceeds native socket budget: {}",
            longest.display()
        );
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
            _runtime_owner: runtime_owner.clone(),
            release,
        }
    };
    (
        make("same-version-payload-a"),
        make("same-version-payload-b"),
    )
}

#[test]
fn release_isolation_fixture_runtime_is_private_short_and_shared_until_last_owner() {
    let first = Arc::new(fixture_runtime());
    let path = first.path().to_path_buf();
    let second = first.clone();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let canonical = std::fs::canonicalize(&path).unwrap();
        assert!(
            canonical
                .join("a1-tabs-00000000000000000000.sock")
                .as_os_str()
                .len()
                < 96
        );
        assert_eq!(
            std::fs::metadata(&canonical).unwrap().permissions().mode() & 0o077,
            0
        );
    }
    let darwin = Path::new(
        "/private/var/folders/ab/0123456789abcdef0123456789abcd/T/.tmp123456/runtime",
    )
    .join("a1-tabs-00000000000000000000.sock");
    assert!(
        darwin.as_os_str().len() >= 96,
        "the original Darwin-shaped fixture must exceed the budget"
    );
    drop(first);
    assert!(
        path.is_dir(),
        "the other release must retain the shared runtime"
    );
    drop(second);
    assert!(!path.exists());
}

struct WorkspaceClient {
    process: std::process::Child,
    stream: terminal_host_contracts::endpoint::EndpointStream,
    _guard: terminal_host_contracts::endpoint::ConnectionGuard,
}
impl WorkspaceClient {
    fn open(host: &Host) -> Self {
        use terminal_host_contracts::roles::{credentials::ProfileCredentials, wire};
        let mut process = host.command(&["workspace-proxy", "--release-root", host.release.to_str().unwrap()])
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit()).spawn().unwrap();
        let mut line = String::new();
        BufReader::new(process.stdout.take().unwrap()).read_line(&mut line).unwrap();
        let endpoint: serde_json::Value = serde_json::from_str(&line).unwrap();
        let mut stream = terminal_host_contracts::endpoint::connect(endpoint["endpoint"].as_str().unwrap()).unwrap();
        let guard = terminal_host_contracts::endpoint::close_on_drop(&stream);
        let credentials = ProfileCredentials::load_existing(&host.state()).unwrap().unwrap();
        wire::send(&mut stream, "hello", Some(1), serde_json::json!({
            "role":"attach", "generation":1, "build":"fixture",
            "releaseId":scope::fixture_release_id(&host.executable).unwrap(), "features":[], "token":credentials.client_token.to_vec(),
        })).unwrap();
        Self { process, stream, _guard: guard }
    }
    fn wait_text(&mut self,id:&str,expected:&str) {
        use terminal_host_contracts::roles::wire;
        for _ in 0..64 {
            let (_,surface):(_,wire::Surface) = wire::body(&self.next("surface")).unwrap();
            let text = surface.structured.as_ref().map(|state| state.row_data.iter().flat_map(|row| row.cells.iter().map(|cell| cell.text.as_str())).collect::<String>())
                .unwrap_or_else(|| String::from_utf8_lossy(&surface.bytes).into_owned());
            if surface.tab_id == id && text.contains(expected) { return; }
        }
        panic!("workspace did not restore the requested source view");
    }
    fn add(&mut self,host:&Host,message:&str,response:&str) -> String {
        use terminal_host_contracts::roles::wire;
        let node = Command::new("node").args(["-p","process.execPath"]).output().unwrap();
        wire::send(&mut self.stream,message,Some(37),wire::TabCreate {
            cwd:host.release.to_string_lossy().into_owned(),columns:80,rows:23,
            release_root:host.release.to_string_lossy().into_owned(),node_executable:String::from_utf8(node.stdout).unwrap().trim().into(),environment:std::env::vars().collect(),
        }).unwrap();
        let (request,target):(_,wire::TabTarget) = wire::body(&self.next(response)).unwrap();
        assert_eq!(request,Some(37),"workspace restores caller request identity");
        target.tab_id
    }
    fn order(&mut self,expected:&[&str]) -> u64 {
        use terminal_host_contracts::roles::wire;
        let deadline = Instant::now()+Duration::from_secs(10);
        loop {
            wire::send(&mut self.stream,"tab.list",Some(9000),wire::ResultBody::ok()).unwrap();
            let mut replies = 0;
            let mut latest = None;
            while replies < 2 {
                let (request,list):(_,wire::TabList) = wire::body(&self.next("tab.list")).unwrap();
                if request != Some(9000) { continue; }
                replies += 1; latest = Some(list);
            }
            let list = latest.unwrap();
            let ids = list.tabs.iter().map(|tab|tab.tab_id.as_str()).collect::<Vec<_>>();
            if ids == expected { return list.revision; }
            assert!(Instant::now()<deadline,"workspace order: {ids:?}, expected {expected:?}");
        }
    }
    fn read_frame(&mut self,deadline:Instant) -> Vec<u8> {
        use terminal_host_contracts::roles::wire;
        terminal_host_contracts::endpoint::set_handshake_deadline(&self.stream,deadline.saturating_duration_since(Instant::now())).unwrap();
        let frame = wire::read_payload(&mut self.stream).unwrap().expect("workspace disconnected");
        let kind = wire::kind(&frame).unwrap().message_type;
        assert!(!matches!(kind.as_str(),"recovery.notice"|"input.rejected"|"input.uncertain"|"tab.create-failed"),"ordinary tab action emitted {kind}: {frame:?}");
        frame
    }
    fn first_view_order(&mut self,id:&str,generation:u64,previous:&[&str],expected:&[&str]) {
        use terminal_host_contracts::roles::wire;
        wire::send(&mut self.stream,"tab.view",None,wire::ViewTarget {tab_id:id.into(),request_generation:generation,resize:None}).unwrap();
        let mut order = previous.iter().map(|id|id.to_string()).collect::<Vec<_>>();
        let deadline = Instant::now()+Duration::from_secs(10);
        loop {
            assert!(Instant::now()<deadline,"view did not produce its first frame");
            let frame = self.read_frame(deadline);
            match wire::kind(&frame).unwrap().message_type.as_str() {
                "tab.list" => { let (_,list):(_,wire::TabList) = wire::body(&frame).unwrap(); order = list.tabs.into_iter().map(|tab|tab.tab_id).collect(); }
                "surface" => {
                    let (_,surface):(_,wire::Surface) = wire::body(&frame).unwrap();
                    if surface.tab_id == id && surface.request_generation == generation {
                        assert_eq!(order,expected,"the first visible surface must not commit the old prewarm slot");
                        return;
                    }
                }
                _ => {}
            }
        }
    }
    fn next(&mut self, message: &str) -> Vec<u8> {
        use terminal_host_contracts::roles::wire;
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            assert!(Instant::now() < deadline, "workspace did not answer {message}");
            let frame = self.read_frame(deadline);
            if wire::kind(&frame).unwrap().message_type == message { return frame; }
        }
    }
}
impl Drop for WorkspaceClient {
    fn drop(&mut self) { let _ = self.process.kill(); let _ = self.process.wait(); }
}

#[test]
fn updated_workspace_reconnects_old_agents_and_creates_new_execution_on_the_selected_release() {
    use terminal_host_contracts::roles::{wire, workspace::WorkspaceTab};
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    std::fs::write(a.release.join("bin/ui.js"), "if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.on('data',b=>process.stdout.write('OLD-echo:'+b.toString()+'\\r\\n'));process.stdout.write('OLD-RUNNING\\r\\n');setInterval(()=>{},1000);").unwrap();
    std::fs::write(b.release.join("bin/ui.js"), "if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.on('data',b=>process.stdout.write('NEW-echo:'+b.toString()+'\\r\\n'));process.stdout.write('NEW-RUNNING\\r\\n');setInterval(()=>{},1000);").unwrap();
    a.call(&["server", "--detach"]); a.create();
    let old_child = a.wait_child();
    let old_owner = a.marker();
    b.call(&["server", "--detach"]);
    let mut client = WorkspaceClient::open(&b);
    client.next("welcome");
    let (_, admission): (_, terminal_host_contracts::protocol::BridgeAttachment) = wire::body(&client.next("attached")).unwrap();
    let qualified = WorkspaceTab::id_for(&scope::fixture_token(&a.profile, &a.executable).unwrap(), "tab-1");
    assert_eq!(admission.selected_tab.as_deref(), Some(qualified.as_str()));
    assert_eq!(admission.initial_tabs.unwrap().tabs.len(), 1);
    wire::send(&mut client.stream, "attach.start", None, serde_json::json!({
        "clientId":"fixture", "cwd":b.release, "columns":80,"rows":23,"releaseRoot":b.release,"nodeExecutable":"node","environment":[],
    })).unwrap();
    wire::send(&mut client.stream, "input", Some(2), wire::Input { bytes:b"x".to_vec(), paste:false, epoch:0 }).unwrap();
    let mut echo = false;
    for _ in 0..20 {
        let (_, surface): (_, wire::Surface) = wire::body(&client.next("surface")).unwrap();
        let text = surface.structured.as_ref().map(|state| state.row_data.iter().flat_map(|row| row.cells.iter().map(|cell| cell.text.as_str())).collect::<String>())
            .unwrap_or_else(|| String::from_utf8_lossy(&surface.bytes).into_owned());
        if text.contains("echo:x") { echo = true; break; }
    }
    assert!(echo, "old Agent must remain controllable through the new client");
    assert!(RegistryStore::read(&b.state().join("registry.json")).unwrap().unwrap().tabs.iter().all(|tab| tab.kind != "agent"));
    let node = Command::new("node").args(["-p","process.execPath"]).output().unwrap();
    wire::send(&mut client.stream, "tab.create", Some(3), wire::TabCreate {
        cwd:b.release.to_string_lossy().into_owned(), columns:80, rows:23, release_root:b.release.to_string_lossy().into_owned(),
        node_executable:String::from_utf8(node.stdout).unwrap().trim().into(), environment:std::env::vars().collect(),
    }).unwrap();
    let (_, created): (_, wire::TabTarget) = wire::body(&client.next("tab.created")).unwrap();
    assert_ne!(created.tab_id, qualified);
    let deadline = Instant::now()+Duration::from_secs(10);
    loop {
        let registry = RegistryStore::read(&b.state().join("registry.json")).unwrap().unwrap();
        if registry.tabs.iter().any(|tab| tab.child_pid.is_some()) { break; }
        assert!(Instant::now()<deadline); std::thread::sleep(Duration::from_millis(20));
    }
    wire::send(&mut client.stream, "tab.view", Some(30), wire::ViewTarget { tab_id:created.tab_id.clone(), request_generation:3, resize:None }).unwrap();
    wire::send(&mut client.stream, "input", Some(31), wire::Input { bytes:b"z".to_vec(), paste:false, epoch:0 }).unwrap();
    client.wait_text(&created.tab_id,"NEW-echo:z");
    wire::send(&mut client.stream, "tab.view", Some(4), wire::ViewTarget { tab_id:qualified.clone(), request_generation:4, resize:None }).unwrap();
    wire::send(&mut client.stream, "input", Some(5), wire::Input { bytes:b"y".to_vec(), paste:false, epoch:0 }).unwrap();
    client.wait_text(&qualified,"OLD-echo:y");
    assert_eq!(a.wait_child(), old_child);
    assert_eq!(a.marker()["pid"], old_owner["pid"]);
    drop(client);
    std::thread::sleep(Duration::from_millis(250));
    let mut reopened = WorkspaceClient::open(&b);
    reopened.next("welcome");
    let (_, admission): (_, terminal_host_contracts::protocol::BridgeAttachment) = wire::body(&reopened.next("attached")).unwrap();
    assert_eq!(admission.initial_tabs.unwrap().tabs.iter().filter(|tab| !tab.tab_id.starts_with("settings-")).count(), 2);
    assert_eq!(admission.selected_tab.as_deref(),Some(qualified.as_str()));
    reopened.wait_text(&qualified,"OLD-echo:y");
    assert_eq!(a.wait_child(), old_child);
}

#[test]
fn workspace_utility_reveal_preserves_append_order_through_metadata_drag_and_reopen() {
    use terminal_host_contracts::roles::{wire,workspace::WorkspaceTab};
    let root = tempfile::tempdir().unwrap();
    let (a,b) = hosts(root.path());
    a.call(&["server","--detach"]); a.create();
    let mut prior = WorkspaceClient::open(&a);
    prior.next("welcome"); prior.next("attached");
    let old_settings = prior.add(&a,"tab.prewarm-settings","tab.created");
    drop(prior);
    b.call(&["server","--detach"]);
    let old = a.wait_child();
    let agent_a = WorkspaceTab::id_for(&scope::fixture_token(&a.profile,&a.executable).unwrap(),"tab-1");
    let mut client = WorkspaceClient::open(&b);
    client.next("welcome"); client.next("attached");
    let settings = client.add(&b,"tab.prewarm-settings","tab.created");
    let agent_b = client.add(&b,"tab.create","tab.created");
    client.order(&[&agent_a,&old_settings,&agent_b]);
    assert_eq!(client.add(&b,"tab.open-settings","tab.selected"),settings);
    client.order(&[&agent_a,&agent_b,&settings]);
    let changelog = client.add(&b,"tab.prewarm-changelog","tab.created");
    let agent_c = client.add(&b,"tab.create","tab.created");
    client.order(&[&agent_a,&agent_b,&settings,&changelog,&agent_c]);
    assert_eq!(client.add(&b,"tab.open-changelog","tab.selected"),changelog);
    let expected = [&*agent_a,&*agent_b,&*settings,&*agent_c,&*changelog];
    let revision = client.order(&expected);
    wire::send(&mut client.stream,"tab.reorder",None,wire::TabReorder {tab_id:changelog.clone(),target_index:0,expected_revision:revision}).unwrap();
    let (_,answer):(_,wire::ResultBody) = wire::body(&client.next("tab.reordered")).unwrap();
    assert!(answer.accepted);
    let dragged = [&*changelog,&*agent_a,&*agent_b,&*settings,&*agent_c];
    client.order(&dragged);
    // Invariant: an ordinary selection must not act like a reveal and move a visible utility.
    wire::send(&mut client.stream,"tab.view",None,wire::ViewTarget {tab_id:settings.clone(),request_generation:9,resize:None}).unwrap();
    client.wait_text(&settings,"ready");
    client.order(&dragged);
    assert_eq!(client.add(&b,"tab.open-settings","tab.selected"),settings);
    let revealed = [&*changelog,&*agent_a,&*agent_b,&*agent_c,&*settings];
    client.order(&revealed);
    std::thread::sleep(Duration::from_millis(300));
    client.order(&revealed);
    drop(client);
    std::thread::sleep(Duration::from_millis(200));
    let mut reopened = WorkspaceClient::open(&b);
    reopened.next("welcome");
    let (_,admission):(_,terminal_host_contracts::protocol::BridgeAttachment) = wire::body(&reopened.next("attached")).unwrap();
    assert_eq!(admission.initial_tabs.unwrap().tabs.iter().map(|tab|tab.tab_id.as_str()).collect::<Vec<_>>(),revealed);
    assert_eq!(a.wait_child(),old);
    let registry = RegistryStore::read(&b.state().join("registry.json")).unwrap().unwrap();
    assert_eq!(registry.tabs.iter().filter(|tab|tab.kind == "settings" && tab.desired != "stopped").count(),1);
    assert_eq!(registry.tabs.iter().filter(|tab|tab.kind == "changelog" && tab.desired != "stopped").count(),1);
}

#[test]
fn workspace_first_utility_frame_uses_final_topology_without_a_caller_refresh() {
    use terminal_host_contracts::roles::workspace::WorkspaceTab;
    let root = tempfile::tempdir().unwrap();
    let (a,b) = hosts(root.path());
    a.call(&["server","--detach"]); a.create(); b.call(&["server","--detach"]);
    let old = a.wait_child();
    let agent_a = WorkspaceTab::id_for(&scope::fixture_token(&a.profile,&a.executable).unwrap(),"tab-1");
    let mut client = WorkspaceClient::open(&b); client.next("welcome"); client.next("attached");
    let settings = client.add(&b,"tab.prewarm-settings","tab.created");
    let agent_b = client.add(&b,"tab.create","tab.created");
    client.order(&[&agent_a,&settings,&agent_b]);
    assert_eq!(client.add(&b,"tab.open-settings","tab.selected"),settings);
    client.first_view_order(&settings,70,&[&agent_a,&settings,&agent_b],&[&agent_a,&agent_b,&settings]);
    let changelog = client.add(&b,"tab.prewarm-changelog","tab.created");
    let agent_c = client.add(&b,"tab.create","tab.created");
    client.order(&[&agent_a,&agent_b,&settings,&changelog,&agent_c]);
    assert_eq!(client.add(&b,"tab.open-changelog","tab.selected"),changelog);
    client.first_view_order(&changelog,71,&[&agent_a,&agent_b,&settings,&changelog,&agent_c],&[&agent_a,&agent_b,&settings,&agent_c,&changelog]);
    assert_eq!(a.wait_child(),old);
}

#[test]
fn workspace_rapid_selection_and_duplicate_close_do_not_emit_internal_notices() {
    use terminal_host_contracts::roles::{wire,workspace::WorkspaceTab};
    let root = tempfile::tempdir().unwrap();
    let (a,b) = hosts(root.path());
    a.call(&["server","--detach"]); a.create(); b.call(&["server","--detach"]);
    let old = a.wait_child();
    let agent_a = WorkspaceTab::id_for(&scope::fixture_token(&a.profile,&a.executable).unwrap(),"tab-1");
    let mut client = WorkspaceClient::open(&b); client.next("welcome"); client.next("attached");
    let agent_b = client.add(&b,"tab.create","tab.created");
    client.order(&[&agent_a,&agent_b]);
    for generation in 1..=200 {
        let id = if generation%2 == 0 { &agent_a } else { &agent_b };
        wire::send(&mut client.stream,"tab.view",None,wire::ViewTarget {tab_id:id.clone(),request_generation:generation,resize:None}).unwrap();
    }
    client.first_view_order(&agent_a,201,&[&agent_a,&agent_b],&[&agent_a,&agent_b]);
    wire::send(&mut client.stream,"tab.view",None,wire::ViewTarget {tab_id:agent_b.clone(),request_generation:202,resize:None}).unwrap();
    for _ in 0..2 { wire::send(&mut client.stream,"tab.close",Some(81),wire::TabTarget {tab_id:agent_b.clone()}).unwrap(); }
    for _ in 0..2 { let (_,answer):(_,wire::ResultBody) = wire::body(&client.next("tab.closed")).unwrap(); assert!(answer.accepted); }
    client.order(&[&agent_a]);
    wire::send(&mut client.stream,"tab.close",Some(82),wire::TabTarget {tab_id:agent_b.clone()}).unwrap();
    let (_,answer):(_,wire::ResultBody) = wire::body(&client.next("tab.closed")).unwrap();
    assert!(answer.accepted); assert_eq!(answer.message,None);
    wire::send(&mut client.stream,"tab.view",None,wire::ViewTarget {tab_id:agent_b,request_generation:203,resize:None}).unwrap();
    client.first_view_order(&agent_a,204,&[&agent_a],&[&agent_a]);
    client.order(&[&agent_a]);
    assert_eq!(a.wait_child(),old);
}

#[test]
fn explicit_source_routes_read_live_cohorts_without_loading_or_replacing_their_code() {
    use terminal_host_contracts::roles::source_route::{SourceRead, SourceRoute};
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    a.call(&["server", "--detach"]);
    a.create();
    let original = a.wait_child();
    let marker = a.marker();
    let route = SourceRoute::open_fixture(&a.profile.join("."), &a.data, &a.release, &a.executable).unwrap();
    assert_eq!(route.release_id(), marker["releaseId"].as_str().unwrap());
    assert_eq!(route.source_scope(), scope::fixture_token(&a.profile, &a.executable).unwrap());
    let contract = route.read(SourceRead::Description, Duration::from_secs(5)).unwrap();
    assert_eq!(contract["epoch"], route.epoch());
    assert_eq!(contract["releaseId"], route.release_id());
    let list = route.read(SourceRead::Tabs, Duration::from_secs(5)).unwrap();
    assert_eq!(list["tabs"][0]["tabId"], "tab-1");
    assert_eq!(a.wait_child(), original);
    assert_eq!(a.marker()["pid"], marker["pid"]);
    // Security: no fallback into an unselected source, root or profile is authorized.
    assert!(SourceRoute::open_fixture(&b.profile, &b.data, &b.release, &b.executable).is_err());
    assert!(SourceRoute::open_fixture(&a.profile, &a.data, &b.release, &a.executable).is_err());
    let other_profile = root.path().join("other-profile");
    std::fs::create_dir_all(&other_profile).unwrap();
    assert!(SourceRoute::open_fixture(&other_profile, &a.data, &a.release, &a.executable).is_err());
    assert!(!b.state().join("registry.json").exists());
    assert_eq!(a.wait_child(), original);
    // Invariant: explicit fixture shutdown invalidates captured custody instead of retargeting it.
    a.call(&["tabs", "host-stop"]);
    assert!(route.read(SourceRead::Tabs, Duration::from_secs(1)).is_err());
}

#[test]
fn runtime_control_description_is_authenticated_read_only_and_release_bound() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    assert_eq!(a.call(&["tabs", "runtime-control"])["host"], "none");
    assert!(!a.state().join("registry.json").exists());
    a.call(&["server", "--detach"]);
    a.create();
    let child = a.wait_child();
    let marker = a.marker();
    let registry = RegistryStore::read(&a.state().join("registry.json")).unwrap().unwrap();
    for _ in 0..3 {
        let report = a.call(&["tabs", "runtime-control"]);
        assert_eq!(report["host"], "running");
        let description = &report["result"];
        assert_eq!(description["api"], "resident-control-v1");
        assert_eq!(description["releaseId"], marker["releaseId"]);
        assert_eq!(description["scope"], scope::fixture_token(&a.profile, &a.executable).unwrap());
        assert_eq!(description["epoch"], registry.epoch);
        assert_eq!(description["bootId"], registry.boot_id);
        assert_eq!(description["osSessionId"], registry.os_session_id);
        assert_eq!(description["retryInput"], false);
        assert_eq!(a.wait_child(), child);
        assert_eq!(a.marker()["pid"], marker["pid"]);
    }
    // Invariant: the same API/generation never substitutes a foreign namespace or starts B.
    assert_eq!(b.call(&["tabs", "runtime-control"])["host"], "none");
    assert!(!b.state().join("registry.json").exists());
    assert_eq!(RegistryStore::read(&a.state().join("registry.json")).unwrap().unwrap(), registry);

    use terminal_host_contracts::roles::wire;
    let mut unauthorized = terminal_host_contracts::endpoint::connect(marker["endpoint"].as_str().unwrap()).unwrap();
    wire::send(&mut unauthorized, "hello", Some(1), serde_json::json!({
        "role": "maintain", "generation": 1, "build": "fixture",
        "releaseId": marker["releaseId"], "token": vec![0_u8; 32],
    })).unwrap();
    terminal_host_contracts::endpoint::set_handshake_deadline(&unauthorized, Duration::from_secs(4)).unwrap();
    let refusal = wire::read_payload(&mut unauthorized).unwrap().unwrap();
    assert_eq!(wire::kind(&refusal).unwrap().message_type, "refused");
    assert_eq!(a.wait_child(), child);
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
fn release_isolation_refuses_foreign_or_missing_owner_release_without_signalling() {
    let root = tempfile::tempdir().unwrap();
    let (a, b) = hosts(root.path());
    b.call(&["server", "--detach"]);
    let foreign_marker = b.marker();
    let foreign_owner = terminal_host_contracts::identity::ProcessIdentity {
        pid: foreign_marker["pid"].as_u64().unwrap() as u32,
        start: foreign_marker["startIdentity"].as_str().unwrap().into(),
    };
    std::fs::create_dir_all(a.state()).unwrap();
    for missing in [true, false] {
        let mut marker = foreign_marker.clone();
        if missing { marker.as_object_mut().unwrap().remove("releaseId"); }
        let bytes = serde_json::to_vec(&marker).unwrap();
        let path = a.state().join("server.json");
        std::fs::write(&path, &bytes).unwrap();
        let recovery = a.command(&["server", "--detach"]).output().unwrap();
        assert!(!recovery.status.success());
        assert!(String::from_utf8_lossy(&recovery.stderr).contains("host-recovery-blocked"));
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
        let stop = a.command(&["tabs", "host-stop"]).output().unwrap();
        assert_eq!(stop.status.code(), Some(3));
        let report: serde_json::Value = serde_json::from_slice(&stop.stdout).unwrap();
        assert_eq!(report["host"], "unverifiable");
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
        assert_eq!(b.marker(), foreign_marker);
        assert_eq!(terminal_host_contracts::identity::inspect_process(foreign_owner.pid).unwrap(), Some(foreign_owner.clone()));
    }
    std::fs::remove_file(a.state().join("server.json")).unwrap();
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
