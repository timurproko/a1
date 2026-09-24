## 1. Terminal Progress

- [ ] 1.1 Publish `100%` only after the active observed summary stream exhausts normally, and verify focused observer/adapter tests retain the 99% estimate cap and reject stale, failed, or disposed terminal updates.
- [ ] 1.2 Widen owned working-progress validation to accept 100 and verify component coverage renders `Compacting(100%)`.

## 2. Lifecycle Evidence

- [ ] 2.1 Extend the pinned `AgentSession` integration fixture to pause between normal stream exhaustion and the real compaction-end event, verifying 100% is visible without controlling compaction and the end event clears it.
- [ ] 2.2 Run focused compaction engine/component tests, typechecking, build, documentation governance, and strict OpenSpec validation; record outcomes and any known-gap disposition in the design artifact.
