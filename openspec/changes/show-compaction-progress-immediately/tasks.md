## 1. Immediate Progress

- [x] 1.1 Publish the observer's deduplicated zero-percent estimate from compaction `begin()` and verify focused adapter coverage sees `workingProgress: 0` before the summary stream function is invoked.
- [x] 1.2 Add a hermetic integration test using pinned Pi's real `AgentSession` compaction lifecycle and verify progress is visible during gated pre-stream work, advances on summary text, and clears when compaction ends.

## 2. Evidence

- [x] 2.1 Run focused compaction/adapter tests, typechecking, build, and strict OpenSpec validation; record the outcomes and any known-gap disposition in the design artifact.
