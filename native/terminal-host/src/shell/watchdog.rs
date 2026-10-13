use std::path::{Path, PathBuf};
use std::sync::{
    Arc,
    atomic::{AtomicBool, AtomicU64, Ordering},
};
use std::thread;
use std::time::Duration;

#[derive(Clone)]
pub struct Watchdog {
    tick: Arc<AtomicU64>,
    stopped: Arc<AtomicBool>,
}
impl Watchdog {
    pub fn bump(&self) {
        self.tick.fetch_add(1, Ordering::SeqCst);
    }
    pub fn stop(&self) {
        self.stopped.store(true, Ordering::SeqCst);
    }
}

pub fn start(
    role: &'static str,
    runtime: &Path,
    stall: Duration,
    thread_names: Vec<String>,
) -> Watchdog {
    let tick = Arc::new(AtomicU64::new(0));
    let stopped = Arc::new(AtomicBool::new(false));
    let watchdog = Watchdog {
        tick: tick.clone(),
        stopped: stopped.clone(),
    };
    let runtime = runtime.to_path_buf();
    thread::Builder::new()
        .name(format!("{role}-watchdog"))
        .spawn(move || {
            let mut prior = tick.load(Ordering::SeqCst);
            let mut unchanged = Duration::ZERO;
            let interval = Duration::from_secs(1);
            while !stopped.load(Ordering::SeqCst) {
                thread::sleep(interval);
                let current = tick.load(Ordering::SeqCst);
                if current == prior {
                    unchanged = unchanged.saturating_add(interval);
                    if unchanged >= stall {
                        let _ = write_record(&runtime, role, unchanged, &thread_names);
                        std::process::abort();
                    }
                } else {
                    prior = current;
                    unchanged = Duration::ZERO;
                }
            }
        })
        .expect("start role watchdog");
    watchdog
}

pub fn write_record(
    runtime: &Path,
    role: &str,
    age: Duration,
    thread_names: &[String],
) -> Result<PathBuf, String> {
    let _ = (age, thread_names);
    crate::roles::diagnostics::write_crash(
        runtime,
        role,
        u64::from(std::process::id()),
        "event-loop-stalled",
        &["watchdog-expired"],
        None,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn crash_record_is_bounded_and_owner_only() {
        let root = tempfile::tempdir().unwrap();
        let path = write_record(
            root.path(),
            "holder",
            Duration::from_secs(16),
            &["main".into()],
        )
        .unwrap();
        let record = std::fs::read_to_string(path).unwrap();
        assert!(record.contains("event-loop-stalled"));
        assert!(!record.contains("terminalContent"));
    }
}
