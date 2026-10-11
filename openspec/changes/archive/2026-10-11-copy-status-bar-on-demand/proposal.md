# Proposal

## Why

Bare A1 lets readers highlight footer/status-bar text, but `Ctrl+C` currently clears that selection without copying it. Readers should be able to copy status values deliberately while selection release remains free of automatic status-bar clipboard writes.

## What Changes

- Make selected bare-A1 footer/status-bar text eligible for explicit `Ctrl+C` frame copying.
- Keep footer/status-bar rows excluded from automatic copy-on-selection, including when the global fullscreen auto-copy setting is enabled.
- Preserve the existing transcript auto-copy behavior and keep prompt input, autocomplete, widgets, notices, transient working status, and other dock chrome excluded from status-bar copying.
- Add focused viewport and fullscreen shell coverage for status-only and mixed transcript/status selections.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Distinguish explicit status-bar copying from automatic transcript-only copying.

## Impact

The change affects bare-A1 frame-selection metadata, clipboard capture policy, and focused selection tests. It adds no setting, dependency, persisted state, installed Pi modification, or behavior change for `a1 pi` and regular terminal-owned selection.
