## Why

Publication run 43732033913 staged 0.2.7-dev.1313 successfully, but the Windows published-pair smoke timed out while updating the public predecessor 0.2.7-dev.1307. Fixture deletion then threw EBUSY and masked the actionable timeout in the job log; the local publication summary reported no detailed evidence even though the uploaded artifact contained it.

## What Changes

- Isolate and repair the Windows published-predecessor update hang at the smallest responsible boundary, retaining real published predecessor execution, exact target selection, and all promotion gates.
- Settle fixture-owned child processes before removal and preserve the original failure when cleanup also fails.
- Surface bounded, sanitized smoke-stage diagnostics through Actions annotations so publication failure reporting does not depend on reading artifact archives manually.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: published-pair smoke retains actionable failure evidence and cleans up its own process tree without hiding the primary failure.

## Impact

Published installer smoke process execution and cleanup, native focused regression fixtures, and publication diagnostics. Any product updater change is conditional on a focused reproduction identifying that boundary; a substantive scope change requires a coherent plan refinement before editing. No registry mutation, dist-tag promotion, package overwrite, publication retry, or merge is authorized by this proposal.
