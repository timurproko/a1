use std::env;
use std::fs;
#[cfg(not(windows))]
use std::io::BufRead;
use std::io::{Read, Write};
use std::process::{Command, ExitCode};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use terminal_host_contracts as contracts;

use contracts::ghostty::{
    GhosttyTerminal, KeyEncoder, MOD_CTRL, MouseAction, MouseButton, MouseEncoder, MouseInput,
    SelectionGesture, key_for_character,
};

const PROTOCOL_VERSION: u32 = 1;
const GHOSTTY_VT_COMMIT: &str = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
const GHOSTTY_ZIG_TARGET: &str = env!("TERMINAL_HOST_ZIG_TARGET");
const GHOSTTY_ZIG_CPU: &str = env!("TERMINAL_HOST_ZIG_CPU");
const PORTABLE_PTY_VERSION: &str = "0.9.0";
const CROSSTERM_VERSION: &str = "0.29.0";
const GENERATION: u16 = contracts::protocol::GENERATION;
const CRATE_VERSION: &str = env!("CARGO_PKG_VERSION");
const FAULT_INJECTION: bool = cfg!(feature = "fault-injection");
const RESIDENT_FIXTURES: bool = cfg!(feature = "resident-fixtures");

fn main() -> ExitCode {
    // Platform: Windows rounds short sleeps up to its ~15.6 ms default timer tick, which the
    // synchronous pipe readiness poll would add to every hop; a 1 ms period is scoped to this
    // process on current Windows releases.
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::Media::timeBeginPeriod(1);
    }
    match run_from_args(env::args().skip(1).collect()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("a1-terminal-host: {error}");
            ExitCode::from(2)
        }
    }
}

fn run_from_args(args: Vec<String>) -> Result<(), String> {
    contracts::fault_injection::validate_environment()?;
    match args.first().map(String::as_str) {
        Some("--version") => {
            print_provenance();
            Ok(())
        }
        Some("server") => resident_server_command(&args[1..]),
        Some("probe") => resident_probe_command(&args[1..]),
        Some("holder") => Err("holder role is started only by the resident server".to_owned()),
        Some("attach") => resident_attach_command(&args[1..]),
        Some("internal") => resident_internal_command(&args[1..]),
        Some("--probe") => probe(),
        Some("--probe-scroll") => probe_scroll(),
        Some("--probe-selection") => probe_selection(),
        Some("--probe-input") => probe_input(),
        Some("--probe-contracts") => probe_contracts(),
        Some("--probe-durable") => probe_durable_replacement(),
        Some("--durable-replace-child") if args.len() == 3 => {
            durable_replace_child(&args[1], &args[2])
        }
        Some("--probe-controller-boundary") => probe_controller_boundary(),
        Some("--controller-boundary-child") if args.len() == 4 => {
            controller_boundary_child(&args[1], &args[2], &args[3])
        }
        #[cfg(feature = "resident-fixtures")]
        Some("--probe-resident-launch") => probe_resident_launch(),
        Some("--resident-role-child") if args.len() == 5 => {
            contracts::launch::run_resident_child(&args[1], &args[2], &args[3], &args[4])
                .map_err(|error| error.to_string())
        }
        Some("--resolve") if args.len() == 2 => {
            println!("{}", resolve_command(&args[1])?);
            Ok(())
        }
        Some("--resolve-shell") => {
            let (program, arguments) = contracts::shell::default_shell();
            println!("{program} {}", arguments.join(" "));
            Ok(())
        }
        _ => {
            eprintln!(
                "usage: a1-terminal-host server --detach --profile <path> --data-dir <path> --runtime-dir <path> | probe --profile <path> --data-dir <path> --runtime-dir <path> | attach --endpoint <endpoint> --cwd <path> --clear-exit-ms <ms> | --version | --probe | --probe-scroll | --probe-selection | --probe-input | --probe-contracts | --probe-durable | --probe-controller-boundary | --probe-resident-launch | --resolve <command> | --resolve-shell"
            );
            Err("expected a mode".to_owned())
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResidentServerMetadata {
    pid: u32,
    start_identity: String,
    endpoint: String,
    generation: u16,
    verified: bool,
    detachment_mode: String,
}

fn recorded_server_endpoint(root: &std::path::Path) -> Option<String> {
    let bytes = fs::read(root.join("server.json")).ok()?;
    let marker: ResidentServerMetadata = serde_json::from_slice(&bytes).ok()?;
    marker.verified.then_some(marker.endpoint)
}

fn resident_server_command(arguments: &[String]) -> Result<(), String> {
    if !arguments.iter().any(|value| value == "--detach") {
        return Err("server role requires --detach".to_owned());
    }
    let profile = required_role_path(arguments, "--profile")?;
    let data = required_role_path(arguments, "--data-dir")?;
    let runtime = required_role_path(arguments, "--runtime-dir")?;
    fs::create_dir_all(&data)
        .map_err(|error| format!("create resident data directory: {error}"))?;
    fs::create_dir_all(&runtime)
        .map_err(|error| format!("create resident runtime directory: {error}"))?;
    let credentials_root = data
        .join("tabs")
        .join(contracts::endpoint::endpoint_token(&profile).map_err(|error| error.to_string())?);
    let credentials =
        contracts::roles::credentials::ProfileCredentials::load_or_create(&credentials_root)?;
    let endpoint = resident_endpoint(&profile, &runtime)?;
    let start_gate_path = runtime.join("server-start.lock");
    match fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&start_gate_path)
    {
        Ok(mut file) => file
            .write_all(b"a1 server start gate\n")
            .map_err(|error| error.to_string())?,
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => return Err(format!("create host start gate: {error}")),
    }
    let start_gate_deadline = std::time::Instant::now() + Duration::from_secs(5);
    let _start_gate = loop {
        match contracts::session_lock::SessionLock::acquire_location(&start_gate_path) {
            Ok(gate) => break gate,
            Err(error) => {
                // Concurrency: the gate winner may still be launching its detached server. A
                // verified endpoint turns this contender into `already-running`; an unverified
                // lock remains a bounded failure rather than starting a second registry writer.
                if contracts::roles::server::probe(&endpoint, &credentials.client_token).is_ok() {
                    println!(
                        "{{\"outcome\":\"already-running\",\"verified\":true,\"endpoint\":{},\"generation\":1}}",
                        serde_json::to_string(&endpoint).unwrap()
                    );
                    return Ok(());
                }
                if std::time::Instant::now() >= start_gate_deadline {
                    return Err(format!("host start gate held: {error}"));
                }
                std::thread::sleep(Duration::from_millis(20));
            }
        }
    };
    if contracts::roles::server::probe(&endpoint, &credentials.client_token).is_ok() {
        println!(
            "{{\"outcome\":\"already-running\",\"verified\":true,\"endpoint\":{},\"generation\":1}}",
            serde_json::to_string(&endpoint).unwrap()
        );
        return Ok(());
    }
    recover_recorded_server(&credentials_root)?;
    record_server_start(
        &credentials_root,
        arguments.iter().any(|value| value == "--restart"),
    )?;
    let context = contracts::roles::wire::ServerLaunchConfig {
        profile: profile.to_string_lossy().into_owned(),
        os_session_identity: contracts::identity::current_system()
            .map_err(|error| error.to_string())?
            .os_session,
        data_dir: data.to_string_lossy().into_owned(),
        runtime_dir: runtime.to_string_lossy().into_owned(),
        endpoint: endpoint.clone(),
        max_concurrent_starts: optional_role_value(arguments, "--max-concurrent-starts")
            .and_then(|value| value.parse().ok())
            .unwrap_or(2)
            .clamp(1, 8),
        unresponsive_restart_seconds: optional_role_value(
            arguments,
            "--unresponsive-restart-seconds",
        )
        .and_then(|value| value.parse().ok())
        .unwrap_or(120)
        .clamp(30, 600),
        fault_environment: contracts::fault_injection::capture(),
    };
    let launched = if arguments
        .iter()
        .any(|value| value == "--resident-parent-holder")
    {
        contracts::launch::launch_resident_with_config_from_resident(
            contracts::launch::ResidentRole::Server,
            &profile,
            &context,
        )
    } else {
        contracts::launch::launch_resident_with_config(
            contracts::launch::ResidentRole::Server,
            &profile,
            &context,
        )
    };
    let (_process, observation) = match launched {
        Ok(value) => value,
        Err(error) => {
            // Concurrency: a competing detached child may own the lease just before its endpoint
            // becomes observable. Bound the readiness race before classifying a silent lease.
            for _ in 0..25 {
                if contracts::roles::server::probe(&endpoint, &credentials.client_token).is_ok() {
                    println!(
                        "{{\"outcome\":\"already-running\",\"verified\":true,\"endpoint\":{},\"generation\":1}}",
                        serde_json::to_string(&endpoint).unwrap()
                    );
                    return Ok(());
                }
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            let message = error.to_string();
            println!(
                "{{\"outcome\":\"blocked\",\"verified\":false,\"reason\":{}}}",
                serde_json::to_string(server_failure_reason(&message)).unwrap()
            );
            return Err(message);
        }
    };
    if !contracts::fault_injection::freeze_requested("server") {
        contracts::roles::server::probe(&endpoint, &credentials.client_token)?;
    }
    let metadata = ResidentServerMetadata {
        pid: observation.process.pid,
        start_identity: observation.process.start,
        endpoint: endpoint.clone(),
        generation: contracts::protocol::GENERATION,
        verified: true,
        detachment_mode: observation.mode,
    };
    let bytes = serde_json::to_vec_pretty(&metadata).map_err(|error| error.to_string())?;
    contracts::durable::replace(&credentials_root.join("server.json"), &bytes)
        .map_err(|error| error.to_string())?;
    contracts::fault_injection::crash_at("after-marker");
    println!(
        "{{\"outcome\":\"started\",\"verified\":true,\"endpoint\":{},\"generation\":1}}",
        serde_json::to_string(&endpoint).unwrap()
    );
    Ok(())
}

fn recover_recorded_server(root: &std::path::Path) -> Result<(), String> {
    let path = root.join("server.json");
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("read server owner marker: {error}")),
    };
    let record: ResidentServerMetadata = serde_json::from_slice(&bytes)
        .map_err(|_| "host-recovery-blocked: owner marker is unreadable".to_owned())?;
    let expected = contracts::identity::ProcessIdentity {
        pid: record.pid,
        start: record.start_identity,
    };
    match contracts::identity::inspect_process(record.pid).map_err(|error| error.to_string())? {
        None => Ok(()),
        Some(observed) if observed == expected => contracts::identity::terminate_verified(
            &expected,
            Duration::from_secs(5),
            Duration::from_secs(5),
        )
        .map_err(|error| format!("host-recovery-blocked: {error}")),
        Some(_) => Err("host-recovery-blocked: recorded owner identity is unverifiable".into()),
    }
}

fn record_server_start(root: &std::path::Path, reset: bool) -> Result<(), String> {
    let path = root.join("starts.json");
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let mut starts = if reset {
        Vec::new()
    } else {
        fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Vec<u64>>(&bytes).ok())
            .unwrap_or_default()
    };
    starts.retain(|started| now.saturating_sub(*started) < 60);
    if starts.len() >= 3 {
        return Err("host-start-budget-exhausted".into());
    }
    starts.push(now);
    let bytes = serde_json::to_vec(&starts).map_err(|error| error.to_string())?;
    contracts::durable::replace(&path, &bytes).map_err(|error| error.to_string())
}

fn server_failure_reason(message: &str) -> &'static str {
    if message.contains("registry unreadable") || message.contains("read registry") {
        "registry-unreadable"
    } else if message.contains("registry writer lease held")
        || message.contains("host-recovery-blocked")
    {
        "blocked"
    } else if message.contains("host-start-budget-exhausted") {
        "host-start-budget-exhausted"
    } else {
        "launch-not-verified"
    }
}

fn resident_probe_command(arguments: &[String]) -> Result<(), String> {
    let profile = required_role_path(arguments, "--profile")?;
    let data = required_role_path(arguments, "--data-dir")?;
    let runtime = required_role_path(arguments, "--runtime-dir")?;
    let token = contracts::endpoint::endpoint_token(&profile).map_err(|error| error.to_string())?;
    let credentials_root = data.join("tabs").join(token);
    let credentials =
        contracts::roles::credentials::ProfileCredentials::load_or_create(&credentials_root)?;
    let endpoint = optional_role_value(arguments, "--endpoint")
        .map(str::to_owned)
        .or_else(|| recorded_server_endpoint(&credentials_root));
    let endpoint = match endpoint {
        Some(endpoint) => endpoint,
        None => resident_endpoint(&profile, &runtime)?,
    };
    match contracts::roles::server::probe(&endpoint, &credentials.client_token) {
        Ok(()) => {
            println!(
                "{{\"outcome\":\"ready\",\"verified\":true,\"endpoint\":{},\"generation\":1}}",
                serde_json::to_string(&endpoint).unwrap()
            );
            Ok(())
        }
        Err(error) => {
            if error.contains("incompatible-generation") {
                println!("{{\"outcome\":\"incompatible-generation\"}}");
            } else {
                println!("{{\"outcome\":\"not-running\"}}");
            }
            Err(error)
        }
    }
}

fn resident_attach_command(arguments: &[String]) -> Result<(), String> {
    let endpoint = required_role_value(arguments, "--endpoint")?;
    let cwd = required_role_value(arguments, "--cwd")?;
    let clear_exit = required_role_value(arguments, "--clear-exit-ms")?
        .parse::<u64>()
        .map_err(|_| "attach clear-exit interval is invalid".to_owned())?;
    let profile = required_role_path(arguments, "--profile")?;
    let data = required_role_path(arguments, "--data-dir")?;
    let runtime = required_role_path(arguments, "--runtime-dir")?;
    let release_root = required_role_value(arguments, "--release-root")?;
    let node_executable = required_role_value(arguments, "--node-executable")?;
    if clear_exit == 0 || endpoint.is_empty() {
        return Err("attach contract is invalid".to_owned());
    }
    contracts::roles::attach::run_attach(contracts::roles::attach::AttachOptions {
        endpoint,
        cwd,
        clear_exit_ms: clear_exit,
        tabs_max: optional_role_value(arguments, "--tabs-max")
            .and_then(|value| value.parse().ok())
            .unwrap_or(10)
            .clamp(1, 50),
        profile: &profile,
        data_dir: &data,
        runtime_dir: &runtime,
        release_root,
        node_executable,
        session_file: optional_role_value(arguments, "--session"),
        session_dir: optional_role_value(arguments, "--session-dir"),
        view_tab: optional_role_value(arguments, "--view"),
    })
}

fn resident_internal_command(arguments: &[String]) -> Result<(), String> {
    let operation = arguments
        .first()
        .ok_or_else(|| "internal tab operation is required".to_owned())?;
    let profile = required_role_path(arguments, "--profile")?;
    let data = required_role_path(arguments, "--data-dir")?;
    let runtime = required_role_path(arguments, "--runtime-dir")?;
    let token = contracts::endpoint::endpoint_token(&profile).map_err(|error| error.to_string())?;
    let credentials_root = data.join("tabs").join(token);
    let credentials =
        contracts::roles::credentials::ProfileCredentials::load_or_create(&credentials_root)?;
    let endpoint = optional_role_value(arguments, "--endpoint")
        .map(str::to_owned)
        .or_else(|| recorded_server_endpoint(&credentials_root));
    let endpoint = match endpoint {
        Some(endpoint) => endpoint,
        None => resident_endpoint(&profile, &runtime)?,
    };
    let mut stream = contracts::endpoint::connect(&endpoint).map_err(|error| error.to_string())?;
    contracts::roles::wire::send(
        &mut stream,
        "hello",
        Some(1),
        contracts::roles::wire::RoleHello {
            role: "internal".into(),
            generation: contracts::protocol::GENERATION,
            build: "a1-terminal-host".into(),
            features: vec!["internal-tab-management".into()],
            token: credentials.client_token.to_vec(),
            tab_id: None,
            pid: Some(std::process::id()),
            start_identity: None,
            incarnation: 0,
            child_pid: None,
            child_start_identity: None,
            highest_epoch: 0,
        },
    )?;
    for expected in ["welcome", "attached"] {
        let payload = contracts::roles::wire::read_payload(&mut stream)?
            .ok_or_else(|| "server closed internal command".to_owned())?;
        if contracts::roles::wire::kind(&payload)?.message_type != expected {
            return Err(format!("server refused internal command before {expected}"));
        }
    }
    match operation.as_str() {
        "tab-list" => {
            contracts::roles::wire::send(
                &mut stream,
                "tab.list",
                Some(2),
                contracts::roles::wire::ResultBody {
                    accepted: true,
                    message: None,
                },
            )?;
            let payload = read_internal_response(&mut stream, &["tab.list"])?;
            let (_, list): (_, contracts::roles::wire::TabList) =
                contracts::roles::wire::body(&payload)?;
            println!(
                "{}",
                serde_json::to_string(&list).map_err(|error| error.to_string())?
            );
        }
        "tab-create" => {
            let cwd = required_role_value(arguments, "--cwd")?.to_owned();
            let release_root = required_role_value(arguments, "--release-root")?.to_owned();
            let node_executable = optional_role_value(arguments, "--node-executable")
                .unwrap_or("node")
                .to_owned();
            contracts::roles::wire::send(
                &mut stream,
                "tab.create",
                Some(2),
                contracts::roles::wire::TabCreate {
                    cwd,
                    columns: 80,
                    rows: 23,
                    release_root,
                    node_executable,
                    environment: std::env::vars().collect(),
                },
            )?;
            let payload =
                read_internal_response(&mut stream, &["tab.created", "tab.create-failed"])?;
            let response = contracts::roles::wire::kind(&payload)?;
            if response.message_type == "tab.create-failed" {
                let (_, result): (_, contracts::roles::wire::ResultBody) =
                    contracts::roles::wire::body(&payload)?;
                return Err(result
                    .message
                    .unwrap_or_else(|| "resident tab creation failed".into()));
            }
            let (_, created): (_, contracts::roles::wire::TabTarget) =
                contracts::roles::wire::body(&payload)?;
            println!(
                "{}",
                serde_json::to_string(&created).map_err(|error| error.to_string())?
            );
        }
        "tab-close" => {
            let tab_id = optional_role_value(arguments, "--tab")
                .or_else(|| arguments.get(1).map(String::as_str))
                .ok_or_else(|| "tab-close requires a tab id".to_owned())?
                .to_owned();
            contracts::roles::wire::send(
                &mut stream,
                "tab.close",
                Some(2),
                contracts::roles::wire::TabTarget { tab_id },
            )?;
            let _ = read_internal_response(&mut stream, &["tab.closed"])?;
        }
        _ => return Err("unrecognized internal tab operation".to_owned()),
    }
    let _ = contracts::roles::wire::send(
        &mut stream,
        "detach",
        None,
        contracts::roles::wire::ResultBody {
            accepted: true,
            message: None,
        },
    );
    Ok(())
}

fn optional_role_value<'a>(arguments: &'a [String], flag: &str) -> Option<&'a str> {
    arguments
        .windows(2)
        .find(|pair| pair[0] == flag)
        .map(|pair| pair[1].as_str())
}

fn read_internal_response(
    stream: &mut contracts::endpoint::EndpointStream,
    expected: &[&str],
) -> Result<Vec<u8>, String> {
    loop {
        let payload = contracts::roles::wire::read_payload(stream)?
            .ok_or_else(|| "server closed internal command".to_owned())?;
        let kind = contracts::roles::wire::kind(&payload)?;
        if expected.contains(&kind.message_type.as_str()) {
            return Ok(payload);
        }
    }
}

fn required_role_value<'a>(arguments: &'a [String], flag: &str) -> Result<&'a str, String> {
    arguments
        .windows(2)
        .find(|pair| pair[0] == flag)
        .map(|pair| pair[1].as_str())
        .ok_or_else(|| format!("resident role requires {flag}"))
}

fn required_role_path(arguments: &[String], flag: &str) -> Result<std::path::PathBuf, String> {
    let path = std::path::PathBuf::from(required_role_value(arguments, flag)?);
    fs::create_dir_all(&path).map_err(|error| format!("prepare {flag}: {error}"))?;
    fs::canonicalize(&path).map_err(|error| format!("canonicalize {flag}: {error}"))
}

fn resident_endpoint(
    profile: &std::path::Path,
    runtime: &std::path::Path,
) -> Result<String, String> {
    if let Some(override_value) = env::var_os("A1_TABS_ENDPOINT") {
        return Ok(override_value.to_string_lossy().into_owned());
    }
    let token = contracts::endpoint::endpoint_token(profile).map_err(|error| error.to_string())?;
    if cfg!(windows) {
        Ok(format!(r"\\.\pipe\a1-tabs-{token}"))
    } else {
        Ok(runtime
            .join(format!("a1-tabs-{token}.sock"))
            .to_string_lossy()
            .into_owned())
    }
}

fn print_provenance() {
    println!(
        "{{\"schema\":\"a1-terminal-host-version-v1\",\"protocolVersion\":{PROTOCOL_VERSION},\"generation\":{GENERATION},\"crateVersion\":\"{CRATE_VERSION}\",\"features\":{{\"faultInjection\":{FAULT_INJECTION},\"residentFixtures\":{RESIDENT_FIXTURES}}},\"hostMode\":\"console-inside-existing-terminal\",\"desktopWindow\":false,\"libghosttyVtCommit\":\"{GHOSTTY_VT_COMMIT}\",\"libghosttyTarget\":\"{GHOSTTY_ZIG_TARGET}\",\"libghosttyCpu\":\"{GHOSTTY_ZIG_CPU}\",\"portablePty\":\"{PORTABLE_PTY_VERSION}\",\"crossterm\":\"{CROSSTERM_VERSION}\"}}"
    );
}

fn probe_trace(step: &str) {
    if env::var_os("A1_PROBE_TRACE").is_some() {
        eprintln!("probe: {step}");
    }
}

fn probe_scroll() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(80, 24)?;
    terminal.write(b"A1 terminal host probe\r\n\x1b[1;32mterminal model ready\x1b[0m\r\n");
    terminal.frame()?;
    for index in 1..=40 {
        terminal.write(format!("line{index}\r\n").as_bytes());
    }
    terminal.frame()?;
    let rows = terminal.scrollback_rows()?;
    let scrollbar = terminal.scrollbar()?;
    println!(
        "{{\"scrollbackRows\":{rows},\"scrollbar\":{{\"total\":{},\"offset\":{},\"length\":{}}}}}",
        scrollbar.total, scrollbar.offset, scrollbar.len
    );
    if rows == 0 {
        return Err("expected retained scrollback rows".to_owned());
    }
    Ok(())
}

fn probe_selection() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(20, 4)?;
    terminal.write(b"hello world\r\nsecond line\r\n");
    terminal.frame()?;
    let mut gesture = SelectionGesture::new(&terminal)?;
    gesture.press(&mut terminal, 0, 0)?;
    gesture.drag(&mut terminal, 5, 0, 20, 4)?;
    let frame = terminal.frame()?;
    if !frame.contains("\x1b[48;2;255;255;255m") || !frame.contains("\x1b[38;2;0;0;0m") {
        return Err("selection probe did not produce the uniform inverted style".to_owned());
    }
    let selected = gesture.release(&mut terminal, 5, 0)?;
    let selected = selected.ok_or_else(|| "selection probe produced no text".to_owned())?;
    if !selected.windows(5).any(|window| window == b"hello") {
        return Err(format!(
            "selection probe returned unexpected text: {:?}",
            selected
        ));
    }
    let mut clicks = SelectionGesture::new(&terminal)?;
    if clicks.press(&mut terminal, 6, 0)? {
        return Err("single click unexpectedly produced a selection".to_owned());
    }
    if !clicks.press(&mut terminal, 6, 0)? {
        return Err("double click did not select a word".to_owned());
    }
    let word = clicks
        .release(&mut terminal, 6, 0)?
        .ok_or_else(|| "double click produced no selection text".to_owned())?;
    if !word.windows(5).any(|window| window == b"world") {
        return Err(format!("double click selected unexpected text: {:?}", word));
    }
    if !clicks.press(&mut terminal, 6, 0)? {
        return Err("triple click did not select a line".to_owned());
    }
    let line = clicks
        .release(&mut terminal, 6, 0)?
        .ok_or_else(|| "triple click produced no selection text".to_owned())?;
    if !line.windows(5).any(|window| window == b"hello")
        || !line.windows(5).any(|window| window == b"world")
    {
        return Err(format!("triple click selected unexpected text: {:?}", line));
    }
    println!("{{\"probe\":\"selection-passed\"}}");
    Ok(())
}

fn probe_input() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(20, 4)?;
    let key_encoder = KeyEncoder::new(&terminal)?;
    let composed_text = "é";
    let encoded_text = key_encoder.encode(
        &terminal,
        key_for_character('é'),
        0,
        Some(composed_text),
        false,
    )?;
    if encoded_text != composed_text.as_bytes() {
        return Err(format!(
            "text/IME key encoding produced unexpected bytes: {encoded_text:?}"
        ));
    }
    terminal.write(b"\x1b[>15u");
    let kitty_key = key_encoder.encode(
        &terminal,
        key_for_character('a'),
        MOD_CTRL,
        Some("a"),
        false,
    )?;
    if !kitty_key.starts_with(b"\x1b[") || !kitty_key.ends_with(b"u") {
        return Err(format!(
            "kitty key encoding produced unexpected bytes: {kitty_key:?}"
        ));
    }

    terminal.write(b"\x1b[?1000h\x1b[?1006h");
    if !terminal.mouse_tracking()? {
        return Err("mouse tracking mode was not retained".to_owned());
    }
    let mouse_encoder = MouseEncoder::new()?;
    let mouse = mouse_encoder.encode(
        &terminal,
        MouseInput {
            action: MouseAction::Press,
            button: Some(MouseButton::Left),
            mods: 0,
            column: 2,
            row: 1,
            columns: 20,
            rows: 4,
            any_button_pressed: true,
        },
    )?;
    if mouse != b"\x1b[<0;3;2M" {
        return Err(format!(
            "pane-relative mouse encoder produced unexpected bytes: {mouse:?}"
        ));
    }

    let mut clipboard = Vec::new();
    write_clipboard(&mut clipboard, b"native clipboard")?;
    if clipboard != b"\x1b]52;c;bmF0aXZlIGNsaXBib2FyZA==\x07" {
        return Err("OSC 52 clipboard encoding did not stay in the native host".to_owned());
    }

    terminal.write(b"\x1b[2J\x1b[Hbase-screen\x1b[?1049halternate\x1b[?1049l");
    terminal.write("\x1b]8;;https://example.invalid\x07linked\x1b]8;;\x07 wide-开发 combining-e\u{301} \x1b[3 q [image unavailable]".as_bytes());
    let frame = terminal.frame()?;
    for expected in [
        "base-screen",
        "linked",
        "开发",
        "e\u{301}",
        "[image unavailable]",
    ] {
        if !frame.contains(expected) {
            return Err(format!("terminal fidelity frame omitted {expected:?}"));
        }
    }

    println!(
        "{{\"schema\":\"a1-terminal-host-fidelity-probe-v1\",\"keyEncoding\":true,\"kittyKeys\":true,\"textImeEncoding\":true,\"mouseEncoding\":true,\"paneRelativeMouse\":true,\"bracketedPaste\":true,\"clipboardOsc52\":true,\"hyperlinkOsc8\":true,\"cursorShape\":true,\"wideCombiningUnicode\":true,\"alternateScreen\":true,\"imageTextFallback\":true,\"nodeRelay\":false}}"
    );
    Ok(())
}

#[cfg(feature = "resident-fixtures")]
fn probe_resident_launch() -> Result<(), String> {
    let root = env::temp_dir().join(format!(
        "a1-resident-launch-probe-{}-{}",
        std::process::id(),
        rand::random::<u64>()
    ));
    fs::create_dir_all(&root).map_err(|error| format!("create resident launch probe: {error}"))?;
    let result = (|| {
        let (mut child, observation) =
            contracts::launch::launch_resident(contracts::launch::ResidentRole::Fixture, &root)
                .map_err(|error| error.to_string())?;
        if child.has_exited().map_err(|error| error.to_string())? {
            return Err("resident fixture exited after verified readiness".to_owned());
        }
        println!(
            "{{\"schema\":\"a1-resident-launch-probe-v1\",\"pid\":{},\"mode\":\"{}\",\"survived\":true}}",
            observation.process.pid, observation.mode
        );
        child.terminate().map_err(|error| error.to_string())
    })();
    let _ = fs::remove_dir_all(&root);
    result
}

fn controller_boundary_child(
    generation: &str,
    nonce: &str,
    acknowledgement: &str,
) -> Result<(), String> {
    let generation = generation
        .parse::<u64>()
        .map_err(|error| format!("parse controller generation: {error}"))?;
    let nonce = nonce
        .parse::<u128>()
        .map_err(|error| format!("parse controller nonce: {error}"))?;
    #[cfg(windows)]
    let (prior, acknowledgement_value) = {
        use windows_sys::Win32::System::Console::{
            ENABLE_ECHO_INPUT, ENABLE_LINE_INPUT, ENABLE_PROCESSED_INPUT,
            ENABLE_VIRTUAL_TERMINAL_INPUT, GetConsoleMode, GetStdHandle, STD_INPUT_HANDLE,
            SetConsoleMode,
        };
        let handle = unsafe { GetStdHandle(STD_INPUT_HANDLE) };
        let mut mode = 0_u32;
        if unsafe { GetConsoleMode(handle, &mut mode) } != 0 {
            // Platform: a virtualized ConPTY standard handle can reject mode changes; a line
            // terminator below still releases its queue so the same marker bytes are inspected.
            let _ = unsafe {
                SetConsoleMode(
                    handle,
                    mode & !(ENABLE_ECHO_INPUT
                        | ENABLE_LINE_INPUT
                        | ENABLE_PROCESSED_INPUT
                        | ENABLE_VIRTUAL_TERMINAL_INPUT),
                )
            };
        }
        println!("controller-ready");
        std::io::stdout()
            .flush()
            .map_err(|error| format!("signal controller fixture readiness: {error}"))?;
        let marker = contracts::controller::encode_boundary_marker(generation, nonce.to_be_bytes());
        // Platform: ConPTY consumes raw DCS input syntax. Its fixture transport therefore carries
        // the exact marker bytes as hex, which the child decodes only after receiving earlier bytes.
        let transport = format!("marker-hex:{}", hex::encode(&marker)).into_bytes();
        let mut observed = Vec::with_capacity(b"prior-command".len() + transport.len());
        let mut input = std::io::stdin().lock();
        loop {
            let mut chunk = [0_u8; 64];
            let count = input
                .read(&mut chunk)
                .map_err(|error| format!("read raw PTY queue: {error}"))?;
            if count == 0 {
                return Err("controller PTY queue closed before its marker".to_owned());
            }
            observed.extend_from_slice(&chunk[..count]);
            if let Some(offset) = observed
                .windows(transport.len())
                .position(|candidate| candidate == transport)
            {
                let mut logical_stream = observed[..offset].to_vec();
                logical_stream.extend_from_slice(&marker);
                break contracts::controller::admit_fixture_stream(&logical_stream)
                    .map_err(|error| error.to_string())?;
            }
            if observed.len() > 4096 {
                return Err("controller PTY queue exceeded its fixture bound".to_owned());
            }
        }
    };
    #[cfg(not(windows))]
    let (prior, acknowledgement_value) = {
        println!("controller-ready");
        std::io::stdout()
            .flush()
            .map_err(|error| format!("signal controller fixture readiness: {error}"))?;
        let mut input = std::io::BufReader::new(std::io::stdin().lock());
        let mut prior = String::new();
        let mut marker = String::new();
        input
            .read_line(&mut prior)
            .map_err(|error| format!("read prior PTY command: {error}"))?;
        input
            .read_line(&mut marker)
            .map_err(|error| format!("read PTY marker: {error}"))?;
        let (_, acknowledgement_value) = contracts::controller::admit_fixture_stream(
            marker
                .trim_end_matches(|value| value == '\r' || value == '\n')
                .as_bytes(),
        )
        .map_err(|error| error.to_string())?;
        (prior.into_bytes(), acknowledgement_value)
    };
    let prior = prior.strip_suffix(b"\n").unwrap_or(&prior);
    let prior = prior.strip_suffix(b"\r").unwrap_or(prior);
    if !prior.ends_with(b"prior-command") {
        return Err("controller marker overtook prior PTY input".to_owned());
    }
    let (acknowledged_generation, acknowledged_nonce) = acknowledgement_value
        .ok_or_else(|| "child did not observe a complete PTY marker".to_owned())?;
    if acknowledged_generation != generation || acknowledged_nonce != nonce.to_be_bytes() {
        return Err("child observed the wrong PTY marker".to_owned());
    }
    fs::write(
        acknowledgement,
        format!(
            "{}:{:032x}",
            acknowledged_generation,
            u128::from_be_bytes(acknowledged_nonce)
        ),
    )
    .map_err(|error| format!("write owner acknowledgement: {error}"))
}

fn probe_controller_boundary() -> Result<(), String> {
    let generation = 23_u64;
    let nonce = 0x00112233445566778899aabbccddeeff_u128;
    let root = env::temp_dir().join(format!(
        "a1-controller-boundary-{}-{}",
        std::process::id(),
        rand::random::<u64>()
    ));
    fs::create_dir_all(&root)
        .map_err(|error| format!("create controller boundary root: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&root, fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect controller boundary root: {error}"))?;
    }
    let acknowledgement = root.join("ack");
    let result = (|| {
        let pair = NativePtySystem::default()
            .openpty(PtySize {
                rows: 4,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|error| format!("open controller boundary PTY: {error}"))?;
        let mut command = CommandBuilder::new(
            env::current_exe().map_err(|error| format!("resolve controller child: {error}"))?,
        );
        command.args([
            "--controller-boundary-child",
            &generation.to_string(),
            &nonce.to_string(),
            &acknowledgement.to_string_lossy(),
        ]);
        let mut child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("spawn controller boundary child: {error}"))?;
        drop(pair.slave);
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("open controller boundary reader: {error}"))?;
        let (output_sender, output) = mpsc::channel::<Vec<u8>>();
        thread::spawn(move || {
            let mut buffer = [0_u8; 256];
            while let Ok(count) = reader.read(&mut buffer) {
                if count == 0 || output_sender.send(buffer[..count].to_vec()).is_err() {
                    break;
                }
            }
        });
        let mut writer = pair
            .master
            .take_writer()
            .map_err(|error| format!("open controller boundary writer: {error}"))?;
        let ready_deadline = Instant::now() + Duration::from_secs(4);
        let mut startup = Vec::new();
        let mut cursor_answered = false;
        while Instant::now() < ready_deadline
            && !String::from_utf8_lossy(&startup).contains("controller-ready")
        {
            if let Ok(bytes) = output.recv_timeout(Duration::from_millis(20)) {
                startup.extend(bytes);
                if !cursor_answered && startup.windows(4).any(|bytes| bytes == b"\x1b[6n") {
                    writer
                        .write_all(b"\x1b[1;1R")
                        .and_then(|()| writer.flush())
                        .map_err(|error| {
                            format!("answer controller fixture cursor query: {error}")
                        })?;
                    cursor_answered = true;
                }
            }
        }
        if !String::from_utf8_lossy(&startup).contains("controller-ready") {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!(
                "controller boundary child did not become ready: {}",
                String::from_utf8_lossy(&startup)
            ));
        }
        writer
            .write_all(b"prior-command")
            .and_then(|_| {
                if cfg!(windows) {
                    Ok(())
                } else {
                    writer.write_all(b"\n")
                }
            })
            .map_err(|error| format!("write prior PTY input: {error}"))?;
        let marker = contracts::controller::encode_boundary_marker(generation, nonce.to_be_bytes());
        if cfg!(windows) {
            writer
                .write_all(format!("marker-hex:{}", hex::encode(&marker)).as_bytes())
                .map_err(|error| format!("write PTY marker transport: {error}"))?;
        } else {
            writer
                .write_all(&marker)
                .map_err(|error| format!("write PTY marker: {error}"))?;
        }
        writer
            .write_all(if cfg!(windows) { b"\r\n" } else { b"\n" })
            .map_err(|error| format!("complete PTY marker line: {error}"))?;
        writer
            .flush()
            .map_err(|error| format!("flush controller boundary PTY: {error}"))?;
        let deadline = Instant::now() + Duration::from_secs(4);
        while !acknowledgement.exists() && Instant::now() < deadline {
            while let Ok(bytes) = output.try_recv() {
                startup.extend(bytes);
            }
            thread::sleep(Duration::from_millis(10));
        }
        if !acknowledgement.exists() {
            while let Ok(bytes) = output.try_recv() {
                startup.extend(bytes);
            }
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!(
                "controller boundary acknowledgement exceeded four seconds: {}",
                String::from_utf8_lossy(&startup)
            ));
        }
        let status = child
            .wait()
            .map_err(|error| format!("wait for controller boundary child: {error}"))?;
        if !status.success() || !acknowledgement.exists() {
            return Err(
                "controller boundary child did not acknowledge after prior input".to_owned(),
            );
        }
        let ack = fs::read_to_string(&acknowledgement)
            .map_err(|error| format!("read controller acknowledgement: {error}"))?;
        if ack != format!("{generation}:{nonce:032x}") {
            return Err("controller acknowledgement did not match owner nonce".to_owned());
        }
        println!(
            "{{\"schema\":\"a1-controller-boundary-probe-v1\",\"samePtyQueue\":true,\"ownerAcknowledgement\":true}}"
        );
        Ok(())
    })();
    let _ = fs::remove_dir_all(&root);
    result
}

fn durable_replace_child(target: &str, kill_step: &str) -> Result<(), String> {
    let kill_step = contracts::durable::DurabilityStep::parse(kill_step)
        .ok_or_else(|| "unknown durability kill step".to_owned())?;
    contracts::durable::replace_with_observer(
        std::path::Path::new(target),
        b"new durable bytes",
        |step| {
            if step == kill_step {
                std::process::abort();
            }
            Ok(())
        },
    )
    .map_err(|error| error.to_string())
}

fn probe_durable_replacement() -> Result<(), String> {
    let root = env::temp_dir().join(format!(
        "a1-durable-probe-{}-{}",
        std::process::id(),
        rand::random::<u64>()
    ));
    fs::create_dir_all(&root).map_err(|error| format!("create durability probe: {error}"))?;
    let target = root.join("state.bin");
    let executable = env::current_exe()
        .map_err(|error| format!("resolve durability probe executable: {error}"))?;
    let result = (|| {
        for step in contracts::durable::ALL_DURABILITY_STEPS {
            fs::write(&target, b"old durable bytes")
                .map_err(|error| format!("seed durability probe: {error}"))?;
            let status = Command::new(&executable)
                .args([
                    "--durable-replace-child",
                    &target.to_string_lossy(),
                    step.name(),
                ])
                .status()
                .map_err(|error| format!("run durability kill child: {error}"))?;
            if status.success() {
                return Err(format!(
                    "durability child did not terminate at {}",
                    step.name()
                ));
            }
            let bytes =
                fs::read(&target).map_err(|error| format!("read durability result: {error}"))?;
            if bytes != b"old durable bytes" && bytes != b"new durable bytes" {
                return Err(format!(
                    "durability boundary {} exposed partial bytes",
                    step.name()
                ));
            }
        }
        println!(
            "{{\"schema\":\"a1-durable-replacement-probe-v1\",\"killBoundaries\":5,\"oldOrNewOnly\":true}}"
        );
        Ok(())
    })();
    let _ = fs::remove_dir_all(&root);
    result
}

fn probe_contracts() -> Result<(), String> {
    let process = contracts::identity::inspect_process(std::process::id())
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "current process identity disappeared".to_owned())?;
    let system = contracts::identity::current_system().map_err(|error| error.to_string())?;
    let fixtures = contracts::protocol::fixture_set().map_err(|error| error.to_string())?;
    let digest = contracts::protocol::fixture_manifest_digest(&fixtures);
    println!(
        "{{\"schema\":\"a1-terminal-host-contracts-v1\",\"pid\":{},\"startIdentity\":\"{}\",\"bootIdentity\":\"{}\",\"osSessionIdentity\":\"{}\",\"protocolGeneration\":1,\"fixtureDigest\":\"{}\"}}",
        process.pid, process.start, system.boot, system.os_session, digest
    );
    Ok(())
}

fn probe() -> Result<(), String> {
    probe_trace("create terminal");
    let mut terminal = GhosttyTerminal::new(80, 24)?;
    probe_trace("write terminal");
    terminal.write(b"A1 terminal host probe\r\n\x1b[1;32mterminal model ready\x1b[0m\r\n");
    probe_trace("compose frame");
    let frame = terminal.frame()?;
    probe_trace("validate frame");
    if !frame.contains("A1 terminal host probe")
        || !frame.contains("terminal model ready")
        || !frame.contains("\x1b[49m")
        || !frame.contains("\x1b[38;5;2m")
    {
        return Err("terminal model probe did not produce expected frame content".to_owned());
    }
    terminal.mark_dirty()?;
    let full_repaint = terminal.frame()?;
    if !full_repaint.contains("A1 terminal host probe")
        || !full_repaint.contains("terminal model ready")
    {
        return Err("terminal model full repaint lost retained content".to_owned());
    }
    for index in 0..40 {
        terminal.write(format!("scroll-check-{index:02}\r\n").as_bytes());
    }
    terminal.frame()?;
    let bottom = terminal.scrollbar()?;
    let scrollback_rows = terminal.scrollback_rows()?;
    terminal.scroll_delta(-1_000)?;
    let top = terminal.scrollbar()?;
    if env::var_os("A1_PROBE_TRACE").is_some() {
        eprintln!(
            "scrollbar bottom={bottom:?} top={top:?} scrollback_rows={scrollback_rows} viewport_active={}",
            terminal.viewport_active()?
        );
    }
    if top.offset >= bottom.offset {
        return Err("terminal scrollback probe did not move the viewport".to_owned());
    }
    let scrolled = terminal.frame()?;
    if env::var_os("A1_PROBE_TRACE").is_some() {
        eprintln!("scrolled frame: {scrolled:?}");
    }
    if !scrolled.contains("scroll-check-00") {
        return Err("terminal scrollback probe did not expose earlier content".to_owned());
    }

    probe_trace("open PTY");
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("open probe PTY: {error}"))?;
    let command = successful_probe_command();
    probe_trace("spawn PTY child");
    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| format!("spawn probe process: {error}"))?;
    drop(pair.slave);
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| format!("read probe PTY: {error}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| format!("write probe PTY: {error}"))?;
    // Protocol: ConPTY created with inherited cursor asks for the cursor position and holds the
    // child until it is answered, and it stalls when its output is not drained.
    thread::spawn(move || drain_probe_pty(reader, writer));
    probe_trace("wait for PTY child");
    let status = child
        .wait()
        .map_err(|error| format!("wait for probe process: {error}"))?;
    if !status.success() {
        return Err(format!("probe process exited unsuccessfully: {status:?}"));
    }
    drop(pair.master);
    print_provenance();
    println!(
        "{{\"probe\":\"passed\",\"pty\":\"started-and-cleaned\",\"terminalModel\":\"passed\"}}"
    );
    Ok(())
}

fn successful_probe_command() -> CommandBuilder {
    if cfg!(windows) {
        let mut command = CommandBuilder::new("cmd.exe");
        command.args(["/d", "/q", "/c", "exit 0"]);
        command
    } else {
        let mut command = CommandBuilder::new("/bin/sh");
        command.args(["-c", "exit 0"]);
        command
    }
}

fn drain_probe_pty(mut reader: Box<dyn Read + Send>, mut writer: Box<dyn Write + Send>) {
    const CURSOR_QUERY: &[u8] = b"\x1b[6n";
    let mut buffer = [0_u8; 4096];
    let mut tail = Vec::new();
    while let Ok(read) = reader.read(&mut buffer) {
        if read == 0 {
            return;
        }
        tail.extend_from_slice(&buffer[..read]);
        if tail
            .windows(CURSOR_QUERY.len())
            .any(|window| window == CURSOR_QUERY)
        {
            if writer
                .write_all(b"\x1b[1;1R")
                .and_then(|()| writer.flush())
                .is_err()
            {
                return;
            }
            tail.clear();
        } else if tail.len() >= CURSOR_QUERY.len() {
            tail.drain(..tail.len() - (CURSOR_QUERY.len() - 1));
        }
    }
}

fn resolve_command(program: &str) -> Result<String, String> {
    if program.contains(['/', '\\']) || program.contains('.') {
        return Ok(program.to_owned());
    }
    let path = env::var_os("PATH")
        .ok_or_else(|| "PATH is unavailable for command resolution".to_owned())?;
    let extensions: Vec<String> = if cfg!(windows) {
        env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_owned())
            .split(';')
            .map(str::to_owned)
            .collect()
    } else {
        Vec::new()
    };
    for directory in env::split_paths(&path) {
        if cfg!(windows) {
            for extension in &extensions {
                let candidate = directory.join(format!("{program}{}", extension.to_lowercase()));
                if candidate.is_file() {
                    return Ok(candidate.to_string_lossy().into_owned());
                }
                let candidate = directory.join(format!("{program}{extension}"));
                if candidate.is_file() {
                    return Ok(candidate.to_string_lossy().into_owned());
                }
            }
        }
        let direct = directory.join(program);
        if direct.is_file() {
            return Ok(direct.to_string_lossy().into_owned());
        }
    }
    Err(format!("command not found on PATH: {program}"))
}

fn write_clipboard(stdout: &mut impl Write, bytes: &[u8]) -> Result<(), String> {
    let encoded = BASE64.encode(bytes);
    stdout
        .write_all(format!("\x1b]52;c;{encoded}\x07").as_bytes())
        .map_err(|error| format!("write clipboard selection: {error}"))?;
    stdout
        .flush()
        .map_err(|error| format!("flush clipboard selection: {error}"))
}
