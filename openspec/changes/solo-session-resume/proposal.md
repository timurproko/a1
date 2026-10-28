## Why

`a1 solo` starts a fresh direct agent, but the resume command printed after leaving a session uses `a1 --session <id>`, which selects resident tabs. A user who wants to continue that saved conversation in the strip-free single-agent UI cannot choose `a1 solo --session <id>`: the CLI rejects every solo argument. When the resident tab still owns the session, bare `a1 --session <id>` merely focuses that tab rather than changing its mode.

## What Changes

- Accept the existing narrow `--session <path|id>` and optional `--session-dir <dir>` grammar after `a1 solo`, while keeping argument-free solo fresh and rejecting all other solo arguments before interactive startup.
- Carry the selected session through the direct launch and restore it in the same A1 profile using the existing Pi session resolver and shared single-writer guard; do not initialize or attach a resident host just to resume.
- When another live resident or solo agent owns that session, do not steal or fork it silently. Report the conflict and give a concrete way to stop the owning tab or agent before retrying the same solo command. Keep the resident `a1 --session` focus behavior unchanged.
- Update help and the emitted session-resume hint so a session exited from solo mode advertises `a1 solo --session <id>` (including any custom session directory). A hint from resident mode continues to use `a1 --session <id>`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-session-resume`: Allow explicit solo-mode restoration and correct mode-specific resume hints while preserving lease safety and session-resolution semantics.
- `a1-shell`: Distinguish valid solo session selection from invalid solo arguments without introducing resident infrastructure.
- `launch-instance-lifecycle`: Keep direct solo session selection invocation-scoped through immutable release, guardian, retry, and owned UI startup.

## Impact

Public CLI parsing/help, launch intent/bootstrap and direct development routing, the direct UI's existing session selection, session-writer conflict diagnostics, resume-hint composition, and focused CLI/launch/runtime tests. No saved-session format change, automatic migration, second renderer, or forced shutdown of a resident tab.
