# Proposal

## Why

Bare A1 currently turns several unrelated internal copy failures into the message `Could not copy the selection; the clipboard is unavailable.` That statement is not a reliable diagnosis and leaves a supported desktop session without the ordinary operating-system clipboard behavior users expect. Visible status, warning, error, and notice text can also be selected while remaining excluded from both automatic copy and `Ctrl+C`.

## What Changes

- Treat text clipboard writing as a required supported-platform capability, using the standard operating-system clipboard for local sessions and a certified terminal clipboard route across remote or resident boundaries.
- Retry transient clipboard contention and use an alternate supported route when the first writer cannot commit the selected text, without rendering copy-failure messages into the session.
- Make selected visible application messages—including status, warning, error, command-result, and notice text—eligible for automatic copy on release and for explicit `Ctrl+C`.
- Preserve exact selected semantic text, current copy-on-select behavior, successful copy acknowledgement, asynchronous bounds, visual selection, and structural-chrome exclusions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Require reliable clipboard delivery and admit selected user-facing application messages through automatic and explicit copy.
- `resident-terminal-host`: Preserve reliable standard-clipboard delivery through the resident boundary without exposing internal copy failures as session messages.

## Impact

The change affects clipboard destination selection, native/platform fallback behavior, resident terminal clipboard routing, dock-message copy metadata, frame-selection extraction, packaging coverage, and focused clipboard/selection tests. It adds no setting or persisted state and does not change regular terminal-owned selection in `a1 pi`.
