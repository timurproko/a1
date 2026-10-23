//! Seeded first prompts. A landing submission reaches its Agent through one owner-only file in
//! the tab's private data directory, written before the child can look for it and deleted by the
//! child once consumed; the bridge only says that a seed exists.

use super::*;

pub(super) const SEED_FILE: &str = "seed-prompt.json";
pub(super) const SEED_SCHEMA: &str = "a1-tab-seed-prompt-v1";

/// The refusal for a seeded prompt over the `tab.create` bound.
pub(super) const SEED_TOO_LONG: &str = "the prompt is longer than 64 KiB";

/// The tabs whose seed file waits for their child. Security: only a flag per tab is held in
/// memory; the text lives in the tab's private file and nowhere else in the server.
#[derive(Debug)]
pub(super) struct SeedLedger {
    /// The profile's private tab data root; each tab's directory is `<root>/<tab-id>`, the
    /// directory the holder passes to the child as `--tab-data-dir`.
    root: std::path::PathBuf,
    pending: std::collections::HashSet<String>,
}

impl SeedLedger {
    pub(super) fn new(root: std::path::PathBuf) -> Self {
        Self {
            root,
            pending: std::collections::HashSet::new(),
        }
    }

    fn directory(&self, tab_id: &str) -> std::path::PathBuf {
        self.root.join(tab_id)
    }

    /// Writes the tab's seed file without marking it pending; a standby is marked only once it
    /// is announced as this tab.
    pub(super) fn write(&self, tab_id: &str, text: &str) -> Result<(), String> {
        write_seed(&self.directory(tab_id), text)
    }

    /// Writes a fresh tab's seed and marks it pending before its holder starts.
    pub(super) fn stage(&mut self, tab_id: &str, text: &str) -> Result<(), String> {
        self.write(tab_id, text)?;
        self.mark(tab_id);
        Ok(())
    }

    pub(super) fn mark(&mut self, tab_id: &str) {
        self.pending.insert(tab_id.to_owned());
    }

    /// Removes a written seed that was never marked, such as a refused promotion's.
    pub(super) fn remove(&self, tab_id: &str) {
        let _ = std::fs::remove_file(self.directory(tab_id).join(SEED_FILE));
    }

    /// Forgets a pending seed and deletes its file: the child consumed it, or the tab closed,
    /// stopped, or failed first. Returns whether one was pending.
    pub(super) fn discard(&mut self, tab_id: &str) -> bool {
        if !self.pending.remove(tab_id) {
            return false;
        }
        self.remove(tab_id);
        true
    }

    /// The content-free `bridge.seed` frame for a tab whose seed is pending.
    pub(super) fn notice(&self, tab_id: &str) -> Result<Option<Vec<u8>>, String> {
        if !self.pending.contains(tab_id) {
            return Ok(None);
        }
        wire::frame("bridge.seed", None, protocol::BridgeSeed {}).map(Some)
    }
}

/// Writes `text` as the seed file in `directory`, owner-only, replacing any earlier one atomically.
fn write_seed(directory: &Path, text: &str) -> Result<(), String> {
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

pub(super) fn stage_seed(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    text: &str,
) -> Result<(), String> {
    lock_state(state)?.seeds.stage(tab_id, text)
}

/// Tells a connected bridge that its seed file is ready; the frame carries no prompt text.
pub(super) fn notify_seed(locked: &RuntimeState, tab_id: &str) -> Result<(), String> {
    if let Some(frame) = locked.seeds.notice(tab_id)?
        && let Some(bridge) = locked.bridges.get(tab_id)
    {
        let _ = bridge.peer.offer_control(frame);
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

        fn ledger(&self) -> SeedLedger {
            SeedLedger::new(self.0.join("tabs").join("profile"))
        }

        fn seed(&self, tab_id: &str) -> std::path::PathBuf {
            self.0
                .join("tabs")
                .join("profile")
                .join(tab_id)
                .join(SEED_FILE)
        }
    }

    impl Drop for Root {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    const PROMPT: &str = "What does this repository build?";

    #[test]
    fn a_fresh_tab_seed_is_one_private_file_announced_without_its_text() {
        let root = Root::new("fresh");
        let mut ledger = root.ledger();
        assert_eq!(ledger.notice("tab-1"), Ok(None), "no seed, no notice");
        ledger.stage("tab-1", PROMPT).unwrap();
        let path = root.seed("tab-1");
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
            assert_eq!(mode(path.parent().unwrap()), 0o700);
        }

        let frame = ledger
            .notice("tab-1")
            .unwrap()
            .expect("a pending seed is announced");
        assert!(
            !frame
                .windows(PROMPT.len())
                .any(|window| window == PROMPT.as_bytes()),
            "the bridge notice carries no prompt text"
        );
        let kind = wire::kind(&frame[4..]).unwrap();
        assert_eq!(kind.message_type, "bridge.seed");
        let (_, body): (_, protocol::BridgeSeed) = wire::body(&frame[4..]).unwrap();
        assert_eq!(body, protocol::BridgeSeed {});

        // Invariant: consumption clears the flag and any file the child failed to delete.
        assert!(ledger.discard("tab-1"));
        assert!(!path.exists());
        assert_eq!(ledger.notice("tab-1"), Ok(None));
        assert!(
            !ledger.discard("tab-1"),
            "a second acknowledgement changes nothing"
        );
    }

    #[test]
    fn a_promoted_standby_is_written_first_and_marked_once_announced() {
        let root = Root::new("promoted");
        let mut ledger = root.ledger();
        ledger.write("standby-1", PROMPT).unwrap();
        assert!(root.seed("standby-1").exists());
        assert_eq!(
            ledger.notice("standby-1"),
            Ok(None),
            "an unannounced standby has no pending seed"
        );
        ledger.mark("standby-1");
        assert!(ledger.notice("standby-1").unwrap().is_some());

        // Invariant: a refused promotion removes its unmarked file and keeps nothing pending.
        ledger.write("standby-2", PROMPT).unwrap();
        ledger.remove("standby-2");
        assert!(!root.seed("standby-2").exists());
        assert!(!ledger.discard("standby-2"));
    }

    #[test]
    fn a_seed_outlives_nothing_when_its_tab_closes_or_fails_first() {
        let root = Root::new("closed");
        let mut ledger = root.ledger();
        ledger.stage("tab-closed", PROMPT).unwrap();
        ledger.stage("tab-failed", "other").unwrap();
        assert!(ledger.discard("tab-closed"));
        assert!(!root.seed("tab-closed").exists());
        assert!(
            root.seed("tab-failed").exists(),
            "other tabs keep their seed"
        );
        assert!(ledger.discard("tab-failed"));
        assert!(!root.seed("tab-failed").exists());
    }

    #[test]
    fn oversized_or_unwritable_seeds_are_refused() {
        let root = Root::new("refused");
        let mut ledger = root.ledger();
        assert_eq!(
            ledger.stage("tab-1", &"x".repeat(wire::MAX_INITIAL_PROMPT_BYTES + 1)),
            Err(SEED_TOO_LONG.to_owned())
        );
        assert!(
            !root.seed("tab-1").parent().unwrap().exists(),
            "nothing is written"
        );
        assert_eq!(ledger.notice("tab-1"), Ok(None));
        ledger
            .stage("tab-1", &"x".repeat(wire::MAX_INITIAL_PROMPT_BYTES))
            .unwrap();

        let blocked = root.seed("tab-2");
        std::fs::write(blocked.parent().unwrap(), b"not a directory").unwrap();
        assert!(ledger.stage("tab-2", PROMPT).is_err());
        assert_eq!(
            ledger.notice("tab-2"),
            Ok(None),
            "a failed write marks nothing"
        );
    }
}
