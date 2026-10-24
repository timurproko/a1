//! Stores the owned `tabBarPlusMenu` setting the attach client's plus-menu dialog changes. It
//! takes the `<file>.lock` directory lock the TypeScript settings writer takes through
//! `proper-lockfile`, rereads the document under it, and replaces it atomically. The rewrite keeps
//! every other value; it does not keep key order, which carries no meaning.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::core::attach::PlusMenu;

const LOCK_ATTEMPTS: u32 = 10;
const LOCK_RETRY: Duration = Duration::from_millis(20);
/// `proper-lockfile`'s default: an older lock belongs to a writer that died holding it.
const STALE_LOCK: Duration = Duration::from_secs(10);
const NAMESPACE: &str = "a1";
const SETTING: &str = "tabBarPlusMenu";
const DEFAULT_VALUE: &str = "";

pub fn write_plus_menu(file: &Path, menu: PlusMenu) -> Result<(), String> {
    let lock = lock_path(file);
    acquire(&lock)?;
    let result = update(file, menu);
    let _ = std::fs::remove_dir(&lock);
    result
}

fn lock_path(file: &Path) -> PathBuf {
    let mut path = file.as_os_str().to_owned();
    path.push(".lock");
    PathBuf::from(path)
}

fn acquire(lock: &Path) -> Result<(), String> {
    for attempt in 0..LOCK_ATTEMPTS {
        match std::fs::create_dir(lock) {
            Ok(()) => return Ok(()),
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                let stale = std::fs::metadata(lock)
                    .and_then(|metadata| metadata.modified())
                    .ok()
                    .and_then(|modified| modified.elapsed().ok())
                    .is_some_and(|age| age >= STALE_LOCK);
                if stale {
                    let _ = std::fs::remove_dir(lock);
                } else if attempt + 1 < LOCK_ATTEMPTS {
                    std::thread::sleep(LOCK_RETRY);
                }
            }
            Err(error) => return Err(format!("settings could not be locked: {error}")),
        }
    }
    Err("settings are being written by another window".into())
}

fn update(file: &Path, menu: PlusMenu) -> Result<(), String> {
    let mut root = match std::fs::read(file) {
        Ok(bytes) => serde_json::from_slice::<serde_json::Value>(&bytes)
            .map_err(|_| "settings.json is not valid JSON".to_owned())?,
        Err(error) if error.kind() == ErrorKind::NotFound => serde_json::json!({}),
        Err(error) => return Err(format!("settings could not be read: {error}")),
    };
    let object = root
        .as_object_mut()
        .ok_or_else(|| "settings.json is not an object".to_owned())?;
    let owned = object
        .entry(NAMESPACE)
        .or_insert_with(|| serde_json::json!({}))
        .as_object_mut()
        .ok_or_else(|| "the a1 settings are not an object".to_owned())?;
    // Invariant: like the TypeScript writer, only a non-default value is stored.
    let value = menu.to_setting();
    if value == DEFAULT_VALUE {
        owned.remove(SETTING);
    } else {
        owned.insert(SETTING.into(), serde_json::Value::String(value));
    }
    if owned.is_empty() {
        object.remove(NAMESPACE);
    }
    let mut text = serde_json::to_string_pretty(&root).map_err(|error| error.to_string())?;
    text.push('\n');
    let mut temporary = file.as_os_str().to_owned();
    temporary.push(format!(".{}.tmp", std::process::id()));
    let temporary = PathBuf::from(temporary);
    std::fs::write(&temporary, text)
        .and_then(|()| std::fs::rename(&temporary, file))
        .map_err(|error| {
            let _ = std::fs::remove_file(&temporary);
            format!("settings could not be written: {error}")
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn read(file: &Path) -> serde_json::Value {
        serde_json::from_slice(&std::fs::read(file).unwrap()).unwrap()
    }

    #[test]
    fn stores_only_a_non_default_menu_and_keeps_every_other_value() {
        let profile = tempfile::tempdir().unwrap();
        let file = profile.path().join("settings.json");
        std::fs::write(
            &file,
            br#"{"theme":"dark","a1":{"accentColor":"cyan"},"pi":{"x":1}}"#,
        )
        .unwrap();
        write_plus_menu(&file, PlusMenu::ALL).unwrap();
        assert_eq!(
            read(&file),
            serde_json::json!({
                "theme": "dark",
                "a1": { "accentColor": "cyan", "tabBarPlusMenu": "settings" },
                "pi": { "x": 1 }
            })
        );
        write_plus_menu(&file, PlusMenu::default()).unwrap();
        assert_eq!(
            read(&file)["a1"],
            serde_json::json!({ "accentColor": "cyan" })
        );
        assert!(!lock_path(&file).exists(), "the lock is released");

        let fresh = profile.path().join("fresh.json");
        write_plus_menu(&fresh, PlusMenu::ALL).unwrap();
        assert_eq!(
            read(&fresh),
            serde_json::json!({ "a1": { "tabBarPlusMenu": "settings" } })
        );
        write_plus_menu(&fresh, PlusMenu::default()).unwrap();
        assert_eq!(
            read(&fresh),
            serde_json::json!({}),
            "an empty namespace is dropped"
        );
    }

    #[test]
    fn waits_for_a_held_lock_and_refuses_a_broken_document() {
        let profile = tempfile::tempdir().unwrap();
        let file = profile.path().join("settings.json");
        std::fs::create_dir(lock_path(&file)).unwrap();
        assert_eq!(
            write_plus_menu(&file, PlusMenu::ALL),
            Err("settings are being written by another window".into())
        );
        assert!(!file.exists());
        std::fs::remove_dir(lock_path(&file)).unwrap();
        std::fs::write(&file, b"{ not json").unwrap();
        assert!(write_plus_menu(&file, PlusMenu::ALL).is_err());
        assert_eq!(std::fs::read(&file).unwrap(), b"{ not json");
        assert!(!lock_path(&file).exists());
    }
}
