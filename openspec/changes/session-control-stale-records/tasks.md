## 1. Prune provably dead discovery records and bound live candidates

- [x] 1.1 Add a bounded serve-time sweep in `session-control.ts` that unlinks records (and their Unix socket paths) whose owner pid is gone, swallowing errors and stopping at its time/count budget.
- [x] 1.2 Rework `requestSessionControl` to keep a raw-size hard ceiling, skip and opportunistically prune dead-owner records, and apply the 256 bound to live candidates only.
- [x] 1.3 Write session-control fixtures for pruning on serve, lookup success past 256 stale records, both limits, untouched live/malformed/foreign records, and budget respect.

## 2. Document discovery-record lifecycle and pruning

- [ ] 2.1 Describe record lifecycle, abrupt-exit accumulation, pruning rules and remaining limits in `docs/features/integration-api.md`.
