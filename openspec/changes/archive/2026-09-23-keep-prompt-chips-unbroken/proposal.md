## Why

Bare A1's submitted-prompt Markdown currently treats spaces inside a visible prompt-chip label as ordinary wrap opportunities. A chip near the right edge can therefore leave its opening bracket and icon on one row while the rest of the label moves to the next, even though prompt chips are atomic editing units.

## What Changes

- Keep each recognized paste, image, file, folder, and URL chip on one submitted-prompt row whenever the complete chip fits the prompt's full content width.
- Move a fitting chip as a whole to the next continuation row instead of wrapping at an internal space.
- Preserve safe width-bounded fallback for a chip wider than an entire content row.
- Preserve the original submitted text, Markdown semantics outside chips, chip labels and links, timestamps, sticky-prompt behavior, transcript selection/copy, and live editor atomicity.
- Keep the explicit `a1 pi` comparison route unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Make canonical prompt-chip labels atomic wrapping units in bare-A1 submitted prompts.

## Impact

The implementation is limited to canonical prompt-chip syntax reuse, the bare-A1 submitted-prompt Markdown presentation boundary, and focused component/shell coverage. It does not change chip storage, attachment delivery, submission/history expansion, editor navigation, persisted messages, installed Pi code, or `a1 pi`.
