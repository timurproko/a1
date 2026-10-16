## Why

The resident-tabs attach client currently removes the tab-strip row twice before forwarding mouse reports to the viewed A1 surface. Hover and click hit testing therefore lands one row above the physical pointer, so pinned prompts and the jump-to-bottom control react only when the pointer is one row below their visible blocks.

## What Changes

- Translate surface mouse coordinates from the outer terminal into the child tab exactly once while keeping tab-strip events attach-owned.
- Apply the corrected row to motion, press, release, drag, and wheel reports so resident tabs match direct single-agent A1 pointer behavior.
- Add focused native coverage for tab-strip exclusion and pane-relative mouse encoding at the first and later child rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Require resident-tab surface mouse reports to preserve the viewed child's visible row coordinates after accounting for the one-row strip.

## Impact

The change affects resident attach-client mouse forwarding and its native tests. It does not alter direct or Pi-comparison launches, tab-strip controls, viewport layout, pointer ownership inside A1, settings, dependencies, or wire protocol schemas.
