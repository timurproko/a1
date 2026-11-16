## 1. Confirm Windows permission-refused pids against the process table

- [x] 1.1 Extend `inspectLiveProcess` with platform, signal and process-table seams; on win32 confirm an `EPERM` pid against a briefly cached `tasklist` snapshot and report it dead when absent, keeping the conservative answer when the table is unavailable.
- [x] 1.2 Write liveness tests for the real probe, Unix refusal semantics, Windows confirmation and absence, table unavailability, and a real-table check on Windows.
