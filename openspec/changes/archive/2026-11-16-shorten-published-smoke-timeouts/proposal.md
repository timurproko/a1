## Why

The Windows Published pair lane in run 43828121742 uses a twenty-minute predecessor-update deadline and repeatedly stalls. Current develop has already reduced that deadline to five minutes and added authenticated legacy-worker crash detection, but installation commands still allow ten minutes and the job allows forty. Failures should surface promptly without losing diagnostics or weakening promotion safety.

## What Changes

- Limit acquisition, fresh installation, predecessor installation, predecessor update, and authenticated installer recovery to two minutes per command on every platform; retain thirty-second queries, launches, and process settlement.
- Bound the smoke step to eight minutes and the Published pair job to ten minutes, with unconditional evidence upload after the smoke.
- Print command budgets at start and periodic phase/elapsed-time progress while waiting, retain process sampling for two-minute commands, and checkpoint sanitized failure evidence before cleanup.
- Preserve authenticated crash detection, fixture ownership, exact package/transcript/activation assertions, and failure-blocked promotion.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: shorter publication smoke deadlines with live phase diagnostics and retained failure evidence.

## Impact

Only publication smoke tooling, the reusable publication workflow, focused tests, and the continuous-integration specification. No product updater changes, registry writes, publication retries, or merge authority.
