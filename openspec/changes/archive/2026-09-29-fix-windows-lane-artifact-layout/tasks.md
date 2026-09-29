## 1. Fix

- [x] 1.1 Upload each Windows lane envelope with its shard records so the archive keeps the `full-lanes/` directory the required job collects.
- [x] 1.2 Add a workflow policy regression that rejects any lane-bearing upload whose archive root would drop `full-lanes/`, and confirm it fails against the previous workflow.

## 2. Prove

- [x] 2.1 Run focused workflow policy, full-regression evidence, and shard tests, typecheck, repository governance, and strict OpenSpec validation; record evidence and gap disposition in `implementation-evidence.md`.
- [x] 2.2 Record in the gap disposition that exact-head Full regression is a handoff gate: all four lanes and `Complete regression required` must pass, reported in the handoff.
