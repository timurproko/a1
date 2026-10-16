## Why

A resident tab already displays the Pi session name in its tab chip, but the viewed agent repeats that same name in the footer path row. Removing the duplicate gives repository and pull-request context more room while keeping the name visible in the strip; direct single-agent launches still need the footer name because they have no tab chip.

## What Changes

- Suppress the session-name suffix in the footer only when the owned shell is running as a resident tab.
- Keep the session name in resident-tab metadata, tab chips, renaming, automatic naming, and terminal program-status reporting.
- Preserve the existing footer name for `a1 solo`, resident fallback launches, `a1 pi`, and other direct sessions.
- Preserve repository path, branch, pull-request badge/link, usage, model, thinking level, extension status, and width behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: A resident tab uses its tab chip as the visible session-name location instead of duplicating the name in the inner footer.

## Impact

Affected areas are resident-shell composition, footer presentation, and focused resident/direct profile regressions. No session data, tab protocol, naming workflow, settings, persistence, or terminal-host behavior changes.
