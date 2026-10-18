use std::fs::{OpenOptions, create_dir_all};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock, mpsc};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

const OBSERVATION_DIRECTORY_ENV: &str = "A1_RESIDENT_PROGRESS_OBSERVATION_DIR";
const OBSERVATION_RUN_ENV: &str = "A1_RESIDENT_PROGRESS_RUN_ID";
const OBSERVATION_QUEUE_CAPACITY: usize = 2_048;

#[derive(Debug, Default, Clone, Copy)]
pub struct ProgressMetadata<'a> {
    pub tab_id: Option<&'a str>,
    pub incarnation: u64,
    pub event_sequence: u64,
    pub revision: u64,
    pub geometry_generation: u64,
    pub bytes: usize,
    pub count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressRecord<'a> {
    schema: &'static str,
    run_id: &'a str,
    role: &'static str,
    stage: &'static str,
    pid: u32,
    timestamp_unix_us: u64,
    clock_error_us: u32,
    sequence: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    tab_id: Option<&'a str>,
    incarnation: u64,
    event_sequence: u64,
    revision: u64,
    geometry_generation: u64,
    bytes: usize,
    count: usize,
    lost_before: u64,
}

struct ObservationSink {
    run_id: String,
    sender: mpsc::SyncSender<Vec<u8>>,
    state: Mutex<ObservationState>,
}

#[derive(Default)]
struct ObservationState {
    sequence: u64,
    lost: u64,
}

static SINK: OnceLock<Option<ObservationSink>> = OnceLock::new();

/// Emits one bounded, payload-free progress record. The writer is opt-in and asynchronous: a full
/// observation queue drops only diagnostics and reports the loss on the next admitted record.
pub fn observe(role: &'static str, stage: &'static str, metadata: ProgressMetadata<'_>) {
    let Some(sink) = SINK.get_or_init(start_sink).as_ref() else {
        return;
    };
    let Ok(mut state) = sink.state.lock() else {
        return;
    };
    state.sequence = state.sequence.saturating_add(1);
    let sequence = state.sequence;
    let lost_before = state.lost;
    state.lost = 0;
    let record = ProgressRecord {
        schema: "a1-resident-progress-observation-v1",
        run_id: &sink.run_id,
        role,
        stage,
        pid: std::process::id(),
        timestamp_unix_us: timestamp_unix_us(),
        // Rationale: SystemTime is the common cross-process clock. One millisecond is a conservative bound
        // for wall-clock quantization and scheduler delay at the call boundary.
        clock_error_us: 1_000,
        sequence,
        tab_id: metadata.tab_id,
        incarnation: metadata.incarnation,
        event_sequence: metadata.event_sequence,
        revision: metadata.revision,
        geometry_generation: metadata.geometry_generation,
        bytes: metadata.bytes,
        count: metadata.count,
        lost_before,
    };
    let Ok(mut encoded) = serde_json::to_vec(&record) else {
        state.lost = lost_before.saturating_add(1);
        return;
    };
    encoded.push(b'\n');
    if sink.sender.try_send(encoded).is_err() {
        state.lost = lost_before.saturating_add(1);
    }
}

fn start_sink() -> Option<ObservationSink> {
    let directory = std::env::var_os(OBSERVATION_DIRECTORY_ENV).map(PathBuf::from)?;
    let run_id = std::env::var(OBSERVATION_RUN_ENV).ok()?;
    if run_id.is_empty() || run_id.len() > 128 {
        return None;
    }
    if create_dir_all(&directory).is_err() {
        return None;
    }
    let path = directory.join(format!("native-{}.jsonl", std::process::id()));
    let (sender, receiver) = mpsc::sync_channel::<Vec<u8>>(OBSERVATION_QUEUE_CAPACITY);
    thread::Builder::new()
        .name("resident-progress-observer".into())
        .spawn(move || {
            let Ok(file) = OpenOptions::new().create(true).append(true).open(path) else {
                return;
            };
            let mut writer = BufWriter::with_capacity(16 * 1024, file);
            while let Ok(record) = receiver.recv() {
                if writer
                    .write_all(&record)
                    .and_then(|()| writer.flush())
                    .is_err()
                {
                    return;
                }
            }
        })
        .ok()?;
    Some(ObservationSink {
        run_id,
        sender,
        state: Mutex::new(ObservationState::default()),
    })
}

fn timestamp_unix_us() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_micros()
        .try_into()
        .unwrap_or(u64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn progress_record_is_payload_free_and_carries_loss() {
        let record = ProgressRecord {
            schema: "a1-resident-progress-observation-v1",
            run_id: "run",
            role: "holder",
            stage: "holder-commit",
            pid: 7,
            timestamp_unix_us: 10,
            clock_error_us: 1_000,
            sequence: 2,
            tab_id: Some("tab-1"),
            incarnation: 3,
            event_sequence: 4,
            revision: 5,
            geometry_generation: 6,
            bytes: 7,
            count: 1,
            lost_before: 8,
        };
        let value = serde_json::to_value(record).expect("serialize observation");
        assert_eq!(value["stage"], "holder-commit");
        assert_eq!(value["revision"], 5);
        assert_eq!(value["lostBefore"], 8);
        assert!(value.get("content").is_none());
        assert!(value.get("cells").is_none());
    }
}
