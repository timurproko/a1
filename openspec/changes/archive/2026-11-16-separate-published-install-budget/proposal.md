## Why

Publication run 43840564157 stopped fresh Windows installation at 120 seconds while npm was still downloading dependencies; its last captured downloads took 114–115 seconds. Earlier successful hosted fresh installs took 124–128 seconds. The shared two-minute limit rejects slow installations before they can finish.

## What Changes

- Give fresh application installation, predecessor installation, and authenticated installer recovery five-minute deadlines on every platform.
- Retain two-minute installer acquisition and predecessor-update deadlines, thirty-second queries and launches, and existing process sampling, failure evidence, cleanup, and promotion checks.
- Increase the Published pair exercise backstop to twenty-five minutes and its job backstop to thirty minutes so sequential bounded commands, diagnostics, and evidence upload have headroom.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: separate installation and predecessor-update deadlines and align outer publication smoke backstops.

## Impact

Publication smoke tooling, reusable publication workflow, focused governance tests, and the continuous-integration specification only. No product installer/updater behavior, registry writes, publication retries, or merge authority.
