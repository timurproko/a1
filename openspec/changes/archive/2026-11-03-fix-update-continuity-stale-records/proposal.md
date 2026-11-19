## Why

The first update after resident-workspace continuity shipped installed and certified the new release, but activation rolled back because one historical tab directory contained a dead legacy `server.json` without the modern release fields. Continuity inspection decoded the complete modern owner schema before checking whether the recorded process still existed, so harmless dead debris was treated like an unverifiable live predecessor. The safe fallback preserved every Agent, but automatic update then recorded an installation failure, hid the prepared candidate, and applied the same-target 24-hour installation cooldown.

## What Changes

- Inspect the minimal native process identity in resident owner records before requiring the current full schema, and ignore a legacy or schema-incomplete record only when its exact recorded process is provably gone or its PID has been reused.
- Keep live, uninspectable, malformed-without-provable-death, wrong-profile, and unsupported predecessor records fail-closed for continuity and activation.
- Record a certified candidate whose activation is continuity-blocked as prepared rather than installation-failed, retry activation without reinstalling npm content, and keep the verified prior client selected until compatibility succeeds.
- Show a sanitized `Update prepared; activation blocked` status while automatic activation is blocked, then replace it with the existing restart-ready status after successful activation.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `resident-terminal-host`: distinguish provably dead legacy owner debris from live or uninspectable resident authority during source discovery.
- `cli-self-update`: preserve and retry a certified continuity-blocked candidate without treating it as a failed installation.
- `owned-pi-ui-foundation`: expose a bounded sanitized prepared-but-blocked automatic-update status.

## Impact

- Native source-route owner discovery and its fixture coverage.
- Resident continuity inspection, update activation, automatic-update durable state, retry scheduling, and release diagnostics.
- Bare A1 and `a1 pi` update-status presentation and focused regression tests.
- No resident Agent, holder, tool process, session writer, or historical runtime record is terminated or deleted by this change.
