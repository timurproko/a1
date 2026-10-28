## Why

A newly published preview was available on npm, but an earlier successful startup check had cached the previous `next` tag for 24 hours. Restarting A1 within that window reused the stale result, and a long-lived session never rechecks the registry. Automatic installation therefore does not reliably follow new stable or development publications without another manual action. An old automatic attempt can also remain recorded as `running` after its owner has gone, leaving no trustworthy account of what happened.

## What Changes

- In `Auto`, discover the running release's own npm channel at startup and periodically while the interactive process lives, with a bounded per-channel cache interval short enough to follow new publications without a manual restart.
- Keep `Notify` check-only and `No`, offline, CI, noninteractive, and source-checkout opt-outs intact; a stable release follows `latest`, while a numbered preview follows `next`.
- Make automatic worker startup, ownership, stale-attempt recovery, and failure/cooldown state accurately reflect whether installation was attempted and verified; retain one updater lease, protected replacement, and existing session continuity.
- Show restart readiness only after the newer certified release is approved and active; do not restart or hot-swap an existing session. Keep explicit update commands for immediate and channel-changing updates.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Refresh automatic release discovery during an interactive session, keep stable and development cache entries independent, and make background installation/retry state reliable.
- `owned-ui-settings`: Explain the shorter bounded Auto check cadence while preserving the three update modes and restart-bound setting.

## Impact

- `src/foundation/release/latest-release.ts`, `automatic-update.ts`, their update state/lease collaborators, and `src/composition/owned-ui.ts`.
- Existing channel-check, coordinator, composition, and exact-package predecessor tests for both `latest` and `next`; update setting text and documentation where they describe the old daily-only check.
- Existing installs cannot acquire new polling behavior until they receive a build containing this change. The supported explicit update command remains the immediate path for an older build whose cache has not expired.
