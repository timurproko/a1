## Why

A1 self-update currently takes about 78 seconds on Windows because it processes roughly 13,800 small runtime files multiple times, so users reasonably mistake a healthy update for a hang and interrupt it. The first priority is to remove redundant payload work, measure the resulting installation time, and decide separately whether progress UI is still necessary.

## What Changes

- Replace repeated source hashing, copying, and destination re-hashing with a bounded single-pass materialization and certification pipeline that preserves immutable release identity and tamper detection.
- Reuse an already verified exact release when present, while never trusting mutable npm installation files or a partial candidate.
- Add measurable activation timing evidence and regression budgets for representative unchanged-dependency preview updates on Windows.
- Preserve concise start/final update output, return to the terminal prompt after verified activation, and keep bare `a1` launch free of installation messages.
- Postpone progress-bar creation until optimized packaged-update timing is measured and reviewed.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cli-self-update`: Require efficient immutable release preparation without weakening verification or failure diagnostics.
- `a1-shell`: Require the immediate replacement command to finish verified activation and return cleanly to the invoking shell before a later launch.
- `isolated-regression-testing`: Add update-performance and payload-operation regression evidence for the exact packaged updater.

## Impact

- Affects `src/foundation/release` identity derivation, materialization, certification, and transaction orchestration.
- Affects packaged update performance tests on Windows and deterministic filesystem-operation tests.
- Adds an internal, process-local trusted materialization proof, but does not change the public command syntax, npm channels, on-disk release identity, supervisor protocol, or stable compatibility claims.
- Coordinates with, but is independent from, `optimize-ci-release-validation`; that change improves validation workflows while this change improves installed runtime update latency.
