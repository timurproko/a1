## 1. Observe terminal compaction results

- [x] 1.1 Register terminal observation on each active summary stream's public result before returning the stream to Pi, while retaining character-delta estimation and the 99% running cap.
- [x] 1.2 Publish 100 only for a successful current-generation result and suppress rejected, failed, aborted, stale, ended, or disposed terminal observations without affecting Pi's stream.

## 2. Prove release-order completion

- [x] 2.1 Add focused observer coverage for pinned Pi's result-before-iterator terminal ordering and retain monotonic estimate, retry/failure, and lifecycle guards.
- [x] 2.2 Update the pinned AgentSession integration to exercise normal result ordering without an artificial result delay and prove status emits 100 before compaction-end cleanup.

## 3. Validate

- [x] 3.1 Run the focused compaction observer, adapter, runtime, pinned-session, and shell status tests plus typechecking and strict OpenSpec validation; record outcomes and known-gap disposition in the design artifact.
