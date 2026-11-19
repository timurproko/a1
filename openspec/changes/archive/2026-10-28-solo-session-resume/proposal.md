## Why

After a solo session exits, its printed resume command is `a1 --session <id>`. That command selects the resident multi-agent UI rather than reopening the exited session as solo. `a1 solo --session <id>` would express the user's intent, but today the CLI rejects every solo argument. A running multi-agent tab is a separate case: its attach client already says to run `a1` to return.

## What Changes

- Accept the existing narrow `--session <path|id>` and optional `--session-dir <dir>` grammar after `a1 solo`, while keeping argument-free solo fresh and rejecting all other solo arguments before interactive startup.
- Carry the selected session through the direct launch and restore it in the same A1 profile using the existing Pi session resolver and shared single-writer guard; do not initialize or attach a resident host just to resume.
- Keep existing single-writer conflict safety without changing, stopping, or transferring resident tabs. Bare `a1` still returns to a running multi-agent host; tabbed `a1 --session` keeps its current behavior.
- Update help and the solo exit hint to advertise `a1 solo --session <id>` (including any custom session directory). Keep resident detach instructions and any existing tabbed resume hints unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-session-resume`: Allow explicit solo-mode restoration and correct mode-specific resume hints while preserving lease safety and session-resolution semantics.
- `a1-shell`: Distinguish valid solo session selection from invalid solo arguments without introducing resident infrastructure.
- `launch-instance-lifecycle`: Keep direct solo session selection invocation-scoped through immutable release, guardian, retry, and owned UI startup.

## Impact

Public CLI parsing/help, launch intent/bootstrap and direct development routing, the direct UI's existing session selection, solo resume-hint composition, and focused CLI/launch/runtime tests. No change to multi-agent attach/exit behavior or existing session-writer conflict policy; no saved-session format change, migration, second renderer, or forced resident shutdown.
