use std::collections::HashMap;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

pub const MAX_ABANDONED_WORKERS: usize = 8;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WorkerEvent<T> {
    Completed { id: u64, incarnation: u64, value: T },
    DeadlineMissed { id: u64, incarnation: u64 },
    FailFast { abandoned: usize },
}

struct Job {
    incarnation: u64,
    deadline: Instant,
    expired: bool,
}

pub struct WorkerPool<T: Send + 'static> {
    maximum: usize,
    next_id: u64,
    jobs: HashMap<u64, Job>,
    tx: mpsc::Sender<(u64, u64, T)>,
    rx: mpsc::Receiver<(u64, u64, T)>,
    abandoned: usize,
}

impl<T: Send + 'static> WorkerPool<T> {
    pub fn new(maximum: usize) -> Self {
        let (tx, rx) = mpsc::channel();
        Self {
            maximum: maximum.max(1),
            next_id: 1,
            jobs: HashMap::new(),
            tx,
            rx,
            abandoned: 0,
        }
    }

    pub fn execute<F>(
        &mut self,
        incarnation: u64,
        timeout: Duration,
        work: F,
    ) -> Result<u64, &'static str>
    where
        F: FnOnce() -> T + Send + 'static,
    {
        self.execute_at(Instant::now(), incarnation, timeout, work)
    }

    pub fn execute_at<F>(
        &mut self,
        now: Instant,
        incarnation: u64,
        timeout: Duration,
        work: F,
    ) -> Result<u64, &'static str>
    where
        F: FnOnce() -> T + Send + 'static,
    {
        if self.abandoned >= MAX_ABANDONED_WORKERS {
            return Err("abandoned-worker-limit");
        }
        if self.jobs.values().filter(|job| !job.expired).count() >= self.maximum {
            return Err("worker-pool-full");
        }
        let id = self.next_id;
        self.next_id = self.next_id.saturating_add(1);
        self.jobs.insert(
            id,
            Job {
                incarnation,
                deadline: now + timeout,
                expired: false,
            },
        );
        let tx = self.tx.clone();
        thread::spawn(move || {
            let _ = tx.send((id, incarnation, work()));
        });
        Ok(id)
    }

    pub fn poll(&mut self, now: Instant) -> Vec<WorkerEvent<T>> {
        let mut events = Vec::new();
        while let Ok((id, incarnation, value)) = self.rx.try_recv() {
            let Some(job) = self.jobs.remove(&id) else {
                continue;
            };
            if !job.expired && job.incarnation == incarnation {
                events.push(WorkerEvent::Completed {
                    id,
                    incarnation,
                    value,
                });
            }
        }
        for (id, job) in &mut self.jobs {
            if !job.expired && now >= job.deadline {
                job.expired = true;
                self.abandoned += 1;
                events.push(WorkerEvent::DeadlineMissed {
                    id: *id,
                    incarnation: job.incarnation,
                });
            }
        }
        if self.abandoned >= MAX_ABANDONED_WORKERS {
            events.push(WorkerEvent::FailFast {
                abandoned: self.abandoned,
            });
        }
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn late_results_are_discarded_by_deadline_with_a_fake_clock() {
        let mut pool = WorkerPool::new(1);
        let now = Instant::now();
        let (release_tx, release_rx) = mpsc::channel();
        pool.execute_at(now, 7, Duration::from_millis(5), move || {
            release_rx.recv().unwrap();
            42
        })
        .unwrap();
        assert!(matches!(
            pool.poll(now + Duration::from_millis(5)).as_slice(),
            [WorkerEvent::DeadlineMissed { incarnation: 7, .. }]
        ));
        release_tx.send(()).unwrap();
        thread::sleep(Duration::from_millis(5));
        assert!(pool.poll(now + Duration::from_millis(6)).is_empty());
    }

    #[test]
    fn fails_fast_after_eight_abandoned_workers() {
        let mut pool = WorkerPool::<()>::new(MAX_ABANDONED_WORKERS);
        let now = Instant::now();
        let mut releases: Vec<mpsc::Sender<()>> = Vec::new();
        for incarnation in 0..MAX_ABANDONED_WORKERS as u64 {
            let (release_tx, release_rx) = mpsc::channel();
            releases.push(release_tx);
            pool.execute_at(now, incarnation, Duration::from_millis(1), move || {
                let _ = release_rx.recv();
            })
            .unwrap();
        }
        let events = pool.poll(now + Duration::from_millis(1));
        assert!(matches!(
            events.last(),
            Some(WorkerEvent::FailFast { abandoned: 8 })
        ));
        assert_eq!(
            pool.execute_at(now, 9, Duration::from_millis(1), || ()),
            Err("abandoned-worker-limit")
        );
        drop(releases);
    }
}
