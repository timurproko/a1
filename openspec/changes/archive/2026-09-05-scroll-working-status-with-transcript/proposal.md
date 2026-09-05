## Why

Bare A1 currently keeps `Working...` visible in the pinned dock even when the reader scrolls back through the transcript. The reader wants that live status to scroll out of view with the transcript instead, while the input editor stays pinned.

## What Changes

- Place the live working-status surface at the scrollable transcript tail in bare A1, not in the pinned dock. This includes its existing retry, compaction, and extension working replacements and associated spacing.
- Keep that placement consistent for fitting, overflowing, and detached views: scrolling far enough away hides the status; returning to the tail reveals it if the work is still active.
- Preserve the indicator's wording, theme, animation, replacement rules, and lifecycle. Status remains transient, non-selectable presentation rather than persisted conversation history.
- Keep queued inputs, non-working status messages, widgets, the active editor or replacement input, and the footer docked; this proposal moves only the live working-status surface, not idle messages or errors.
- Preserve detached reading position, follow-tail behavior, scrollbar geometry, and jump-to-bottom behavior as the status appears, changes height, or disappears.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Revise dock ownership and transient pointer exclusions, and define the working status as a scrollable, non-persistent tail surface.

## Impact

- Expected implementation areas: `src/integrations/pi/session-ui/session-shell-root.ts` for presentation ownership and caching, the viewport component/controller for tail geometry and input exclusion, and focused shell/component/terminal-paint tests.
- No backend event, persistence format, public setting, dependency, or installed Pi changes. The pinned `a1 pi` comparison route remains unchanged; this is a declared bare-A1 layout difference.
- This deliberately supersedes the working-status dock-only clauses of the active `stabilize-streaming-rendering` plan, but preserves its stable ownership, no-duplication, responsiveness, and rendering-safety goals. Queued-input dock ownership is not changed.
- The independent `fix-jump-to-bottom-stationary-hover` change remains in scope for compatibility, not reimplementation.
- This delivery is OpenSpec-only. Implementation requires the merged proposal and a subsequent explicit request.
