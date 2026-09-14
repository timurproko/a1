## Why

After linked agent output scrolls, hovering unrelated text or an empty row can display an underline with an old link's width. The existing native-hyperlink cleanup has reproducible gaps in redraw preservation and link-geometry tracking, so link decoration must be reconciled with the presented viewport rather than relying on mouse movement alone.

## What Changes

- Track visible hyperlink occurrences by final screen row, display-column bounds, and target, including separate occurrences of the same target.
- Invalidate obsolete link regions after scrolling, streaming, reflow, resize, or surface changes, including when the pointer is stationary or no prior hover report was received.
- Carry explicit hyperlink-cleanup intent through presentation so an optimizer cannot remove a required clear or replace cleanup with an unsafe regional shift.
- Evaluate both prior presented and desired hyperlink state before allowing damage optimizations, including transitions to a link-free frame.
- Preserve clickable file and URL links, existing colors, selection/copy behavior, and bounded rendering for unaffected content; avoid unconditional screen clears on ordinary mouse motion.
- Require deterministic controller and terminal-write regressions plus physical Windows Terminal acceptance, distinguishing OSC 8 links from terminal auto-detected links.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require hyperlink hover decoration and cleanup to follow current visible link geometry, preserve cleanup through damage optimization, and prove absence of stale underlines in the affected terminal.

## Impact

- Expected implementation areas: `src/ui/components/spans.ts`, `src/integrations/pi/session-ui/session-viewport-controller.ts`, `session-shell-root.ts`, `session-shell.ts`, and the A1-owned `src/integrations/pi/tui-runtime/` presentation boundary.
- Expected evidence areas: span utilities, viewport-controller tests, shell/runtime terminal-write tests, and exact-candidate Windows Terminal review.
- Scope is bare A1's owned fullscreen viewport. `a1 pi`, untouched Pi, installed dependencies, link activation policy, and semantic transcript/copy text remain unchanged.
- No dependency upgrade, terminal-setting change, new public setting, or blanket removal of hyperlinks is proposed. The screenshot is symptom evidence, not proof that either identified code gap alone explains the host renderer's behavior.
