use std::env;
use std::fs;
use std::path::Path;
use std::process::ExitCode;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(windows)]
mod windows;

const GUARDIAN_PROTOCOL_VERSION: u32 = 1;

fn main() -> ExitCode {
    match run(env::args().skip(1).collect()) {
        Ok(code) => ExitCode::from(code),
        Err(error) => {
            eprintln!("a1-process-guardian: {error}");
            ExitCode::from(2)
        }
    }
}

fn run(arguments: Vec<String>) -> Result<u8, String> {
    if arguments.as_slice() == ["--version"] {
        println!(
            "a1-process-guardian {} protocol={GUARDIAN_PROTOCOL_VERSION} target={}",
            env!("CARGO_PKG_VERSION"),
            env::consts::OS,
        );
        return Ok(0);
    }
    if arguments.first().map(String::as_str) == Some("--inspect-pid") {
        if arguments.len() != 2 {
            return Err(usage("--inspect-pid requires exactly one PID"));
        }
        let pid = arguments[1]
            .parse::<u32>()
            .map_err(|_| usage("inspected PID must be a positive integer"))?;
        if pid == 0 {
            return Err(usage("inspected PID must be positive"));
        }
        #[cfg(windows)]
        {
            return match windows::inspect_process_start(pid)? {
                Some(start_identity) => {
                    println!("{{\"pid\":{pid},\"startIdentity\":\"{start_identity}\"}}");
                    Ok(0)
                }
                None => Ok(3),
            };
        }
        #[cfg(not(windows))]
        {
            return Err(format!("process inspection is not implemented for {}", env::consts::OS));
        }
    }

    let invocation = Invocation::parse(arguments)?;
    #[cfg(windows)]
    {
        return windows::run(invocation);
    }
    #[cfg(target_os = "linux")]
    {
        return linux::run(invocation);
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    {
        let _ = invocation;
        Err(format!(
            "CONTAINMENT_UNSUPPORTED: process containment is not certified for {}",
            env::consts::OS
        ))
    }
}

#[derive(Debug)]
struct Invocation {
    parent_pid: u32,
    instance_id: String,
    status_file: String,
    executable: String,
    arguments: Vec<String>,
}

impl Invocation {
    fn parse(arguments: Vec<String>) -> Result<Self, String> {
        let separator = arguments
            .iter()
            .position(|value| value == "--")
            .ok_or_else(|| usage("missing -- command separator"))?;
        let options = &arguments[..separator];
        let command = &arguments[separator + 1..];
        if command.is_empty() {
            return Err(usage("missing contained executable"));
        }

        let mut parent_pid = None;
        let mut instance_id = None;
        let mut status_file = None;
        let mut index = 0;
        while index < options.len() {
            match options[index].as_str() {
                "--parent-pid" if index + 1 < options.len() => {
                    parent_pid = Some(
                        options[index + 1]
                            .parse::<u32>()
                            .map_err(|_| usage("parent PID must be a positive integer"))?,
                    );
                    index += 2;
                }
                "--instance" if index + 1 < options.len() => {
                    instance_id = Some(options[index + 1].clone());
                    index += 2;
                }
                "--status-file" if index + 1 < options.len() => {
                    status_file = Some(options[index + 1].clone());
                    index += 2;
                }
                unknown => return Err(usage(&format!("unknown option {unknown}"))),
            }
        }

        let parent_pid = parent_pid.ok_or_else(|| usage("missing --parent-pid"))?;
        if parent_pid == 0 {
            return Err(usage("parent PID must be positive"));
        }
        let instance_id = instance_id.ok_or_else(|| usage("missing --instance"))?;
        if instance_id.is_empty() || instance_id.len() > 512 || instance_id.contains('\0') {
            return Err(usage("instance identity is invalid"));
        }
        let status_file = status_file.ok_or_else(|| usage("missing --status-file"))?;
        if status_file.is_empty() || status_file.len() > 4_096 || status_file.contains('\0') {
            return Err(usage("status file path is invalid"));
        }
        if command.iter().any(|value| value.contains('\0')) {
            return Err(usage("contained command contains a null byte"));
        }

        Ok(Self {
            parent_pid,
            instance_id,
            status_file,
            executable: command[0].clone(),
            arguments: command[1..].to_vec(),
        })
    }
}

fn write_ready_status(
    path: &str,
    pid: u32,
    start_identity: &str,
    containment_provider: &str,
    containment_token: &str,
) -> Result<(), String> {
    if [start_identity, containment_provider, containment_token]
        .iter()
        .any(|value| value.contains(['"', '\\', '\0', '\n', '\r']))
    {
        return Err("guardian identity contains a character unsafe for bounded status JSON".to_owned());
    }
    let target = Path::new(path);
    let temporary = target.with_extension(format!("{}.tmp", std::process::id()));
    let value = format!(
        "{{\"pid\":{pid},\"startIdentity\":\"{start_identity}\",\"containmentProvider\":\"{containment_provider}\",\"containmentToken\":\"{containment_token}\"}}"
    );
    fs::write(&temporary, value)
        .map_err(|error| format!("cannot write guardian ready status: {error}"))?;
    fs::rename(&temporary, target)
        .map_err(|error| format!("cannot publish guardian ready status: {error}"))?;
    Ok(())
}

fn usage(reason: &str) -> String {
    format!(
        "{reason}; usage: a1-process-guardian --parent-pid <pid> --instance <id> --status-file <path> -- <executable> [arguments...]"
    )
}

#[cfg(test)]
mod tests {
    use super::Invocation;

    #[test]
    fn parses_exact_command_without_shell_interpretation() {
        let invocation = Invocation::parse(vec![
            "--parent-pid".into(),
            "42".into(),
            "--instance".into(),
            "instance-1".into(),
            "--status-file".into(),
            "status.json".into(),
            "--".into(),
            "C:\\Program Files\\nodejs\\node.exe".into(),
            "value with spaces".into(),
        ])
        .expect("valid invocation");
        assert_eq!(invocation.parent_pid, 42);
        assert_eq!(invocation.instance_id, "instance-1");
        assert_eq!(invocation.status_file, "status.json");
        assert_eq!(invocation.arguments, ["value with spaces"]);
    }

    #[test]
    fn requires_parent_instance_status_and_exact_executable() {
        assert!(Invocation::parse(vec!["--".into()]).is_err());
        assert!(Invocation::parse(vec![
            "--parent-pid".into(),
            "0".into(),
            "--instance".into(),
            "instance-1".into(),
            "--status-file".into(),
            "status.json".into(),
            "--".into(),
            "node".into(),
        ])
        .is_err());
    }
}
