//! Seeded first prompts. A landing submission reaches its Agent through one owner-only file in
//! the tab's private data directory, written before the child can look for it and deleted by the
//! child once consumed; the bridge only says that a seed exists. The server holds the pending
//! flag in its core tab runtime and never the text.

use super::*;

pub(super) const SEED_FILE: &str = "seed-prompt.json";
pub(super) const SEED_SCHEMA: &str = "a1-tab-seed-prompt-v1";

/// The refusal for a seeded prompt over the `tab.create` bound.
pub(super) const SEED_TOO_LONG: &str = "the prompt is longer than 64 KiB";

/// The tab's private data directory: the one the holder passes to the child as `--tab-data-dir`.
pub(super) fn tab_data_dir(
    locked: &RuntimeState,
    tab_id: &str,
) -> Result<std::path::PathBuf, String> {
    let token =
        crate::endpoint::endpoint_token(&locked.profile).map_err(|error| error.to_string())?;
    Ok(Path::new(&locked.server_config.data_dir)
        .join("tabs")
        .join(token)
        .join(tab_id))
}

/// Writes `text` as the seed file in `directory`, owner-only, replacing any earlier one atomically.
pub(super) fn write_seed(directory: &Path, text: &str) -> Result<(), String> {
    if text.len() > wire::MAX_INITIAL_PROMPT_BYTES {
        return Err(SEED_TOO_LONG.into());
    }
    std::fs::create_dir_all(directory)
        .map_err(|error| format!("create tab data directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(directory, std::fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect tab data directory: {error}"))?;
    }
    let document = serde_json::to_vec(&serde_json::json!({
        "schema": SEED_SCHEMA,
        "text": text,
    }))
    .map_err(|error| format!("encode seed prompt: {error}"))?;
    let path = directory.join(SEED_FILE);
    crate::durable::replace(&path, &document).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("protect seed prompt: {error}"))?;
    }
    Ok(())
}

pub(super) fn remove_seed(directory: &Path) {
    let _ = std::fs::remove_file(directory.join(SEED_FILE));
}

/// Writes a fresh tab's seed and marks it pending before its holder starts.
pub(super) fn stage_seed(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    text: &str,
) -> Result<(), String> {
    let mut locked = lock_state(state)?;
    write_seed(&tab_data_dir(&locked, tab_id)?, text)?;
    locked.core.set_seed_pending(tab_id, true);
    Ok(())
}

/// Forgets a pending seed and deletes its file: the child consumed it, or the tab closed,
/// stopped, or failed first.
pub(super) fn discard_seed(locked: &mut RuntimeState, tab_id: &str) {
    if locked.core.set_seed_pending(tab_id, false)
        && let Ok(directory) = tab_data_dir(locked, tab_id)
    {
        remove_seed(&directory);
    }
}

/// The content-free notice that a tab's seed file is ready.
pub(super) fn seed_notice() -> Result<Vec<u8>, String> {
    wire::frame("bridge.seed", None, protocol::BridgeSeed {})
}

/// Marks a promoted standby's seed pending and tells its bridge. Protocol: a bridge that connected
/// before the promotion has had its admission notice already, so it is told now.
pub(super) fn announce_seed(state: &Arc<Mutex<RuntimeState>>, tab_id: &str) -> Result<(), String> {
    let mut locked = lock_state(state)?;
    locked.core.set_seed_pending(tab_id, true);
    notify_seed(&locked, tab_id)
}

/// Tells a connected bridge that its pending seed file is ready.
pub(super) fn notify_seed(locked: &RuntimeState, tab_id: &str) -> Result<(), String> {
    if locked.core.seed_pending(tab_id)
        && let Some(bridge) = locked.bridges.get(tab_id)
    {
        let _ = bridge.peer.offer_control(seed_notice()?);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Root(std::path::PathBuf);

    impl Root {
        fn new(name: &str) -> Self {
            Self(std::env::temp_dir().join(format!(
                "a1-seed-{name}-{}-{}",
                std::process::id(),
                rand::random::<u32>()
            )))
        }

        fn tab(&self, tab_id: &str) -> std::path::PathBuf {
            self.0.join("tabs").join("profile").join(tab_id)
        }
    }

    impl Drop for Root {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    const PROMPT: &str = "What does this repository build?";

    #[test]
    fn a_seed_is_one_private_schema_file_that_removal_deletes() {
        let root = Root::new("write");
        let tab = root.tab("tab-1");
        write_seed(&tab, PROMPT).unwrap();
        let path = tab.join(SEED_FILE);
        let document: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(document["schema"], SEED_SCHEMA);
        assert_eq!(document["text"], PROMPT);
        assert_eq!(document.as_object().unwrap().len(), 2);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = |path: &Path| std::fs::metadata(path).unwrap().permissions().mode() & 0o777;
            assert_eq!(mode(&path), 0o600);
            assert_eq!(mode(&tab), 0o700);
        }
        write_seed(&tab, "replacement").unwrap();
        let replaced: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(replaced["text"], "replacement");
        remove_seed(&tab);
        assert!(!path.exists());
        remove_seed(&tab);
    }

    #[test]
    fn the_seed_notice_carries_no_prompt_text() {
        let frame = seed_notice().unwrap();
        assert!(
            !frame
                .windows(PROMPT.len())
                .any(|window| window == PROMPT.as_bytes())
        );
        assert_eq!(wire::kind(&frame[4..]).unwrap().message_type, "bridge.seed");
        let (_, body): (_, protocol::BridgeSeed) = wire::body(&frame[4..]).unwrap();
        assert_eq!(body, protocol::BridgeSeed {});
    }

    #[test]
    fn oversized_or_unwritable_seeds_are_refused_and_write_nothing() {
        let root = Root::new("refused");
        let tab = root.tab("tab-1");
        assert_eq!(
            write_seed(&tab, &"x".repeat(wire::MAX_INITIAL_PROMPT_BYTES + 1)),
            Err(SEED_TOO_LONG.to_owned())
        );
        assert!(!tab.exists());
        write_seed(&tab, &"x".repeat(wire::MAX_INITIAL_PROMPT_BYTES)).unwrap();
        let blocked = root.tab("tab-2");
        std::fs::write(&blocked, b"not a directory").unwrap();
        assert!(write_seed(&blocked, PROMPT).is_err());
    }
}
