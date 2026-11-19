## Why

Publication run 43750083689 (0.2.7-dev.1319) failed only the Windows published pair, again at `update-predecessor`, but this time with the evidence added by `fix-published-smoke-windows-budget`. The public predecessor 0.2.7-dev.1307 updater waited its full fifteen minutes because its detached recovery guardian and that guardian's npm child both disappeared within one second of each other about two minutes in, right after npm had finished unpacking, bin links, and lifecycle scripts. npm wrote no exit record, the guardian wrote no result, and no fixture-owned process was alive at the deadline. The previous failure died at a different npm phase, and the same pair passes repeatedly on a developer's Windows machine.

That pattern indicates external termination of the detached process tree on the hosted runner rather than an updater code path, but the current evidence cannot name the terminator or the order in which processes vanished. The harness records the live process set only at the deadline, never during the update, and reads no system records at all.

## What Changes

- Sample the fixture-owned process inventory periodically while a long smoke command runs and record each process's first and last sighting with sanitized arguments, so a failure shows which process disappeared first and when.
- On a Windows failure, read bounded sanitized Windows event records since the fixture began from the Defender operational log, application crash and error-reporting providers, and service or shutdown events, with the antimalware real-time and behavior-monitoring status, so a security remediation or crash is named directly in evidence.
- Record the replacement state of both installation prefixes at failure: retired package directories, installed manifest version, and which entry the public launchers name, so evidence shows how far npm got before the tree vanished.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: published-pair failure evidence identifies process disappearance order, Windows security or crash records, and replacement progress without changing any smoke assertion or the published updater.

## Impact

Published installer smoke evidence in `scripts/release/smoke-published-installer.mjs` and process sampling in `scripts/release/published-smoke-processes.mjs`, with focused regression tests. No product, updater, installer, registry, dist-tag, promotion, or job environment change; antimalware remains enabled and is only observed. No publication retry or merge is authorized by this proposal.
