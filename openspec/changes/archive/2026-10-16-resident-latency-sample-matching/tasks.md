## 1. Attribute samples to their sends

- [x] 1.1 Match each processed-input line by token and by a timestamp at or after the measured send.
- [x] 1.2 Count negative or non-numeric recorded latencies as rejected samples that fail their metric, and report them.

## 2. Prove the measurement

- [x] 2.1 Add focused coverage for stale-line matching, p95 over the full sample set, rejected samples, and metrics recorded only by the first sample.
- [x] 2.2 Replay the failing macOS run's recorded samples through the summary and record focused results and gaps in implementation evidence.
