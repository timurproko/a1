use std::fs::{OpenOptions, create_dir_all};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock, mpsc};
use std::thread;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

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
    pub event_kind: Option<&'a str>,
    pub duration_us: Option<u64>,
    pub idle_wait_us: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressRecord<'a> {
    schema: &'static str,
    run_id: &'a str,
    role: &'static str,
    stage: &'static str,
    pid: u32,
    process_instance: &'a str,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    event_kind: Option<&'a str>,
    lost_before: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration_us: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    idle_wait_us: Option<u64>,
    monotonic_us: u64,
    clock_epoch: u64,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    clock_discontinuity: bool,
}

struct ObservationSink {
    run_id: String,
    process_instance: String,
    sender: mpsc::SyncSender<Vec<u8>>,
    state: Mutex<ObservationState>,
    started: Instant,
}

#[derive(Default)]
struct ObservationState {
    sequence: u64,
    lost: u64,
    clock: ObservationClock,
}

#[derive(Default)]
struct ObservationClock {
    previous: Option<(u64, u64)>,
    epoch: u64,
}
impl ObservationClock {
    fn stamp(&mut self, wall: u64, monotonic: u64, wake_gap: bool) -> bool {
        let discontinuity = wake_gap
            || self
                .previous
                .is_some_and(|(previous_wall, previous_monotonic)| {
                    monotonic < previous_monotonic
                        || wall.abs_diff(
                            previous_wall
                                .saturating_add(monotonic.saturating_sub(previous_monotonic)),
                        ) > 1_000_000
                });
        if discontinuity {
            self.epoch = self.epoch.saturating_add(1);
        }
        self.previous = Some((wall, monotonic));
        discontinuity
    }
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
    let timestamp_unix_us = timestamp_unix_us();
    let monotonic_us = sink.started.elapsed().as_micros().min(u128::from(u64::MAX)) as u64;
    let clock_discontinuity =
        state
            .clock
            .stamp(timestamp_unix_us, monotonic_us, stage == "wake-gap");
    let record = ProgressRecord {
        schema: "a1-resident-progress-observation-v1",
        run_id: &sink.run_id,
        role,
        stage,
        pid: std::process::id(),
        process_instance: &sink.process_instance,
        timestamp_unix_us,
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
        event_kind: metadata.event_kind,
        lost_before,
        duration_us: metadata.duration_us,
        idle_wait_us: metadata.idle_wait_us,
        monotonic_us,
        clock_epoch: state.clock.epoch,
        clock_discontinuity,
    };
    let Ok(mut encoded) = serde_json::to_vec(&record) else {
        state.lost = lost_before.saturating_add(1);
        return;
    };
    encoded.push(b'\n');
    state.lost = offer_record(&sink.sender, encoded, lost_before);
}

fn offer_record(sender: &mpsc::SyncSender<Vec<u8>>, encoded: Vec<u8>, lost_before: u64) -> u64 {
    if sender.try_send(encoded).is_err() {
        lost_before.saturating_add(1)
    } else {
        0
    }
}

/// Protocol: configure a fixed holder from its authenticated launch environment. Detached
/// resident launch clears ambient state, so the holder copies only this payload-free route.
pub fn configure_from_launch_environment(environment: &[(String, String)]) {
    let Some(directory) = environment.iter().find_map(|(name, value)| {
        (name == OBSERVATION_DIRECTORY_ENV).then(|| PathBuf::from(value))
    }) else {
        return;
    };
    let Some(run_id) = environment
        .iter()
        .find_map(|(name, value)| (name == OBSERVATION_RUN_ENV).then(|| value.clone()))
    else {
        return;
    };
    let _ = SINK.set(start_sink_at(directory, run_id));
}

fn start_sink() -> Option<ObservationSink> {
    let directory = std::env::var_os(OBSERVATION_DIRECTORY_ENV).map(PathBuf::from)?;
    let run_id = std::env::var(OBSERVATION_RUN_ENV).ok()?;
    start_sink_at(directory, run_id)
}

fn start_sink_at(directory: PathBuf, run_id: String) -> Option<ObservationSink> {
    if run_id.is_empty() || run_id.len() > 128 {
        return None;
    }
    if create_dir_all(&directory).is_err() {
        return None;
    }
    let process_instance = format!("{}-{:016x}", std::process::id(), rand::random::<u64>());
    let path = directory.join(format!("native-{process_instance}.jsonl"));
    let (sender, receiver) = mpsc::sync_channel::<Vec<u8>>(OBSERVATION_QUEUE_CAPACITY);
    thread::Builder::new()
        .name("resident-progress-observer".into())
        .spawn(move || {
            let Ok(file) = OpenOptions::new().create(true).append(true).open(path) else {
                return;
            };
            let _ = write_observations(receiver, BufWriter::with_capacity(16 * 1024, file));
        })
        .ok()?;
    Some(ObservationSink {
        run_id,
        process_instance,
        sender,
        state: Mutex::new(ObservationState::default()),
        started: Instant::now(),
    })
}

/// Drain an already available burst before flushing; idle observations remain visible at once.
/// The bounded queue still reports overflow rather than blocking any live terminal work.
fn write_observations(
    receiver: mpsc::Receiver<Vec<u8>>,
    mut writer: impl Write,
) -> std::io::Result<()> {
    while let Ok(record) = receiver.recv() {
        writer.write_all(&record)?;
        for _ in 1..64 {
            match receiver.try_recv() {
                Ok(record) => writer.write_all(&record)?,
                Err(_) => break,
            }
        }
        writer.flush()?;
    }
    Ok(())
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
    fn observation_writer_batches_bursts_and_keeps_each_record_visible_in_order() {
        #[derive(Default)]
        struct CountingWriter {
            bytes: Vec<u8>,
            flushes: usize,
        }
        impl Write for CountingWriter {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                self.bytes.extend_from_slice(bytes);
                Ok(bytes.len())
            }
            fn flush(&mut self) -> std::io::Result<()> {
                self.flushes += 1;
                Ok(())
            }
        }
        let (sender, receiver) = mpsc::sync_channel(OBSERVATION_QUEUE_CAPACITY);
        for index in 0..129 {
            sender.send(format!("{index}\n").into_bytes()).unwrap();
        }
        drop(sender);
        let mut writer = CountingWriter::default();
        write_observations(receiver, &mut writer).unwrap();
        assert_eq!(writer.flushes, 3);
        assert_eq!(
            String::from_utf8(writer.bytes).unwrap(),
            (0..129)
                .map(|index| format!("{index}\n"))
                .collect::<String>()
        );
    }

    #[test]
    fn progress_record_is_payload_free_and_carries_loss() {
        let record = ProgressRecord {
            schema: "a1-resident-progress-observation-v1",
            run_id: "run",
            role: "holder",
            stage: "holder-commit",
            pid: 7,
            process_instance: "7-instance",
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
            event_kind: Some("complete"),
            lost_before: 8,
            duration_us: Some(12),
            idle_wait_us: Some(90_000),
            monotonic_us: 15,
            clock_epoch: 1,
            clock_discontinuity: true,
        };
        let value = serde_json::to_value(record).expect("serialize observation");
        assert_eq!(value["stage"], "holder-commit");
        assert_eq!(value["revision"], 5);
        assert_eq!(value["eventKind"], "complete");
        assert_eq!(value["lostBefore"], 8);
        assert!(value.get("content").is_none());
        assert!(value.get("cells").is_none());
        assert_eq!(value["durationUs"], 12);
        assert_eq!(value["idleWaitUs"], 90_000);
        assert_eq!(value["monotonicUs"], 15);
        assert_eq!(value["clockEpoch"], 1);
    }

    #[test]
    fn clock_epochs_separate_wake_and_wall_discontinuities() {
        let mut clock = ObservationClock::default();
        assert!(!clock.stamp(10_000_000, 0, false));
        assert!(!clock.stamp(10_100_000, 100_000, false));
        assert!(clock.stamp(20_100_000, 10_100_000, true));
        assert_eq!(clock.epoch, 1);
        assert!(!clock.stamp(20_200_000, 10_200_000, false));
        assert!(clock.stamp(5_000_000, 10_300_000, false));
        assert_eq!(clock.epoch, 2);
        assert!(clock.stamp(50_000_000, 10_400_000, false));
        assert_eq!(clock.epoch, 3);
    }

    #[test]
    fn full_or_disconnected_diagnostic_queue_drops_without_blocking() {
        let (sender, receiver) = mpsc::sync_channel(1);
        assert_eq!(offer_record(&sender, vec![1], 0), 0);
        assert_eq!(offer_record(&sender, vec![2], 0), 1);
        assert_eq!(offer_record(&sender, vec![3], 1), 2);
        assert_eq!(receiver.recv().unwrap(), vec![1]);
        assert_eq!(offer_record(&sender, vec![4], 2), 0);
        assert_eq!(receiver.recv().unwrap(), vec![4]);
        drop(receiver);
        assert_eq!(offer_record(&sender, vec![5], 0), 1);
    }
}
