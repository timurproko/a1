## Why

The session-writer guard introduced by resident-tabs milestone 3 creates and binds an empty session file before Pi persists its first user message. Pi intentionally creates a fresh session with exclusive `wx` semantics on that first message, so every new A1 session now fails with `EEXIST` and the agent never starts responding.

## What Changes

- Initialize a newly reserved session file through a Pi-compatible handoff after binding its stable file identity, so the first prompt persists normally without weakening writer exclusivity.
- Apply the same handoff to initial startup and in-runtime new/fork replacements while preserving existing-session admission and acquire-before-release ordering.
- Add focused regressions that submit the first user message in an initial session and after `/new`, proving valid JSONL persistence and preventing another `EEXIST` regression.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-tab-reliability`: Require fresh A1 session reservations to remain writable by Pi on the first user message, including after session replacement.

## Impact

The change affects the Pi runtime session-writer coordinator and focused runtime-integration tests. It does not alter stored existing sessions, lock identity, resident-host startup, provider requests, settings, dependencies, or external Pi behavior.
