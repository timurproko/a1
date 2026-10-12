use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;
const MAX_LOG_GENERATIONS: usize = 3;
const MAX_CRASH_BYTES: usize = 64 * 1024;
const MAX_CRASH_RECORDS: usize = 50;
const MAX_CRASH_AGE: Duration = Duration::from_secs(30 * 24 * 60 * 60);
const REASONS: &[&str] = &[
    "child-exit",
    "event-loop-stalled",
    "holder-lost",
    "server-crash",
    "holder-crash",
    "unresponsive-child",
    "fault-injection",
];

pub fn append_log(root: &Path, role: &str, event: &str) -> Result<(), String> {
    if !(role == "server" || role.starts_with("holder-"))
        || !role
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"-_".contains(&byte))
        || !event
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"-_.".contains(&byte))
    {
        return Err("diagnostic log event is outside the allowlist".into());
    }
    prepare(root)?;
    let path = root.join(format!("terminal-host-{role}.log"));
    rotate_log(&path)?;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|error| format!("open diagnostic log: {error}"))?;
    writeln!(file, "{} role={role} event={event}", timestamp())
        .map_err(|error| format!("write diagnostic log: {error}"))?;
    file.sync_data()
        .map_err(|error| format!("sync diagnostic log: {error}"))?;
    protect(&path)?;
    Ok(())
}

pub fn write_crash(
    root: &Path,
    role: &str,
    incarnation: u64,
    reason_code: &str,
    recent_events: &[&str],
    child_record: Option<&str>,
) -> Result<PathBuf, String> {
    if !matches!(role, "server" | "holder" | "attach" | "child") || !REASONS.contains(&reason_code)
    {
        return Err("crash diagnostic classification is outside the allowlist".into());
    }
    if recent_events.iter().any(|event| {
        !event
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"-_.".contains(&byte))
    }) {
        return Err("crash diagnostic event is outside the allowlist".into());
    }
    let child_record = child_record.filter(|name| {
        !name.contains(['/', '\\'])
            && name
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"-_.".contains(&byte))
    });
    prepare(root)?;
    let stamp = timestamp();
    let mut backtrace = std::backtrace::Backtrace::force_capture().to_string();
    backtrace.truncate(48 * 1024);
    let encode = |backtrace: &str| {
        serde_json::to_vec_pretty(&serde_json::json!({
            "timestamp": stamp,
            "role": role,
            "incarnation": incarnation,
            "reasonCode": reason_code,
            "recentEvents": recent_events,
            "backtrace": backtrace,
            "childRecord": child_record,
        }))
        .map_err(|error| error.to_string())
    };
    let mut bytes = encode(&backtrace)?;
    if bytes.len() > MAX_CRASH_BYTES {
        bytes = encode("backtrace-truncated")?;
    }
    let path = root.join(format!("crash-{role}-{incarnation}-{}.json", timestamp()));
    crate::fault_injection::crash_at("crash-record-during-write");
    crate::durable::replace(&path, &bytes).map_err(|error| error.to_string())?;
    protect(&path)?;
    prune_crashes(root)?;
    Ok(path)
}

pub fn newest_child_record(root: &Path) -> Option<String> {
    std::fs::read_dir(root)
        .ok()?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().starts_with("fatal-"))
        .max_by_key(|entry| {
            entry
                .metadata()
                .and_then(|metadata| metadata.modified())
                .ok()
        })
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
}

fn prepare(root: &Path) -> Result<(), String> {
    std::fs::create_dir_all(root)
        .map_err(|error| format!("create diagnostics directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(root, std::fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect diagnostics directory: {error}"))?;
    }
    Ok(())
}

fn protect(_path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(_path, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("protect diagnostic file: {error}"))?;
    }
    Ok(())
}

fn rotate_log(path: &Path) -> Result<(), String> {
    if std::fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0)
        < MAX_LOG_BYTES
    {
        return Ok(());
    }
    for index in (1..MAX_LOG_GENERATIONS).rev() {
        let source = path.with_extension(format!("log.{index}"));
        let target = path.with_extension(format!("log.{}", index + 1));
        if source.exists() {
            let _ = std::fs::rename(source, target);
        }
    }
    std::fs::rename(path, path.with_extension("log.1"))
        .map_err(|error| format!("rotate diagnostic log: {error}"))
}

fn prune_crashes(root: &Path) -> Result<(), String> {
    let now = SystemTime::now();
    let mut files = std::fs::read_dir(root)
        .map_err(|error| format!("read diagnostics: {error}"))?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().starts_with("crash-"))
        .filter_map(|entry| Some((entry.metadata().ok()?.modified().ok()?, entry.path())))
        .collect::<Vec<_>>();
    files.sort_by_key(|(modified, _)| *modified);
    for (_, path) in files.iter().filter(|(modified, _)| {
        now.duration_since(*modified)
            .is_ok_and(|age| age > MAX_CRASH_AGE)
    }) {
        let _ = std::fs::remove_file(path);
    }
    files.retain(|(_, path)| path.exists());
    let remove = files.len().saturating_sub(MAX_CRASH_RECORDS);
    for (_, path) in files.into_iter().take(remove) {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

fn timestamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crash_records_are_distinct_bounded_and_allowlisted() {
        let root = tempfile::tempdir().unwrap();
        let one = write_crash(
            root.path(),
            "holder",
            1,
            "child-exit",
            &["child-exited"],
            None,
        )
        .unwrap();
        std::thread::sleep(Duration::from_millis(2));
        let two = write_crash(
            root.path(),
            "holder",
            2,
            "child-exit",
            &["child-exited"],
            Some("fatal-1-a.json"),
        )
        .unwrap();
        assert_ne!(one, two);
        for path in [one, two] {
            let bytes = std::fs::read(path).unwrap();
            assert!(bytes.len() <= MAX_CRASH_BYTES);
            let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
            assert!(value.get("reasonCode").is_some());
            assert!(value.get("environment").is_none());
            assert!(value.get("prompt").is_none());
        }
        assert!(write_crash(root.path(), "holder", 3, "arbitrary secret", &[], None).is_err());
    }

    #[test]
    fn logs_append_without_startup_truncation() {
        let root = tempfile::tempdir().unwrap();
        append_log(root.path(), "server", "started").unwrap();
        append_log(root.path(), "server", "restarted").unwrap();
        let text = std::fs::read_to_string(root.path().join("terminal-host-server.log")).unwrap();
        assert!(text.contains("started"));
        assert!(text.contains("restarted"));
    }
}
