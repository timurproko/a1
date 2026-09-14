## Context

See `proposal.md` for motivation. This change crosses viewport input routing, the editor port, and bottom-control presentation, so a short design makes the ownership boundary explicit.

`SessionViewportController.handlePreInput` currently consumes Home/End and calls the existing beginning/end navigation operations. `SessionShell` bypasses that pre-router for overlays and replacement inputs. The editor port restricts the terminal-key names the controller can match. Shell tests explicitly expect Ctrl+Home/End to edit the prompt, and several other tests use those chords to position the cursor.

`TranscriptViewport.compose` builds the generic and counted bottom labels with `(End)`, measures their terminal display width, centers the chosen label, and uses that same geometry for hover and click handling. It already falls back from a counted label to the generic label, then omits the control if neither fits.

## Goals / Non-Goals

**Goals:**
- Change input ownership at the existing bare-A1 viewport boundary, reusing established editor movement and viewport follow-state logic.
- Treat the arrow as part of one label and hit target, not a separate UI element.
- Keep help, routing, and regression fixtures consistent with the accepted bindings.

**Non-Goals:**
- No new focus mode, shortcut customization system, persisted setting, key decoder, or terminal-host binding.
- No changes to prompt-boundary navigation, mouse scrolling, message-count semantics, themes, or control placement.
- No modifications to installed dependencies, synchronized upstream editor internals, or `a1 pi` comparison behavior.

## Decisions

### 1. Swap routing at the viewport pre-input boundary

Match Ctrl+Home/Ctrl+End through the existing terminal-key matcher exposed by the editor port, extending its key-name type as needed. Reuse the current scroll-to-beginning and scroll-to-end operations, rendering/activity scheduling, and follow behavior. Consume both recognized chords even when scrolling is a no-op, so fitting content cannot turn a content shortcut into prompt movement. Audit the before-first-frame path so recognized content chords cannot leak into the editor there either.

Stop consuming plain Home/End in the viewport. Let the existing editor line-start/line-end actions handle them; inspect bare-A1 alias setup and retain or restore the unmodified keys there as needed. Logical-line navigation is the deliberate interpretation of Home/End: do not introduce visual-row navigation for soft wraps. Preserve existing selection and unrelated editing behavior rather than synthesizing text edits or cursor coordinates in the viewport.

Retain the shell's overlay/replacement-input bypass and existing routing gates. Do not move these bindings into a global terminal hook, which could steal events from modal surfaces or comparison profiles. Do not replace the established matcher with a pair of hardcoded escape strings, which would miss supported terminal encodings and risk modifier collisions.

### 2. Keep the hint and arrow inside the existing label

Use exactly these inner label texts, retaining existing outer padding:
- `Jump to bottom (Ctrl+End) ↓`
- `1 new message (Ctrl+End) ↓`
- `N new messages (Ctrl+End) ↓`

Use plain U+2193, without emoji variation selectors, an icon dependency, or an independent arrow hit region. Continue deriving centering, fit decisions, hover, and click bounds from the complete label's display width. Preserve the existing counted-to-generic fallback and omission behavior; no truncated label, extra row, or invisible target should be introduced. The longer shortcut hint necessarily increases the minimum width at which the unchanged full-label presentation fits.

The user's screenshot is a visual reference for the trailing arrow, not a request to reproduce other screenshot styling. Preserve existing normal/hover styles and stationary-pointer reconciliation, including when the count or terminal size changes.

### 3. Update help and tests by semantic intent

Bare-A1 shortcut help must show the effective editor and content bindings rather than blindly advertising an editor alias that the pre-router consumes. Keep any presentation override scoped to the owned viewport; comparison help stays unchanged.

Update fixtures according to their purpose: use Home/End for prompt positioning and Ctrl+Home/Ctrl+End for viewport positioning. Do not mechanically replace all sequences, because editor-only and comparison tests have different ownership contexts. Add negative assertions for cursor/draft changes during content navigation and for viewport/follow changes during prompt navigation.

## Risks / Trade-offs

- [Legacy and extended key encodings differ] → Exercise the existing matcher's supported forms and negative additional-modifier cases through shell routing, not just controller mocks.
- [A no-op or pre-frame input falls through] → Consume recognized content shortcuts independently of whether a scroll/render occurs; cover empty, fitting, repeated-boundary, and startup cases.
- [Longer labels alter hover/click geometry] → Test display widths, both label variants, arrow-edge clicks, narrow-width fallback/omission, resize, and stationary-pointer hover.
- [Old fixture setup hides regressions] → Audit tests using Home/End and Ctrl variants by intended surface, keeping unrelated editor aliases covered.
- [Shortcuts are intercepted by the terminal itself] → Physical acceptance must use a terminal that forwards the chords; report host interception separately rather than adding global host configuration.

## Migration Plan

There is no data migration or dependency upgrade. Users of the old bindings switch transcript jumps to Ctrl+Home/Ctrl+End and prompt line movement to Home/End, with the bottom-control hint and shortcut help explaining the new mapping. Rollback should revert routing, help, and labels together so the displayed shortcut never disagrees with its action.

Acceptance uses deterministic viewport, shell-routing, and label tests plus a built candidate in Windows Terminal/Git Bash. Check a multiline draft with overflowing and actively streaming content; verify prompt-only Home/End, cursor-preserving Ctrl navigation, the exact downward-arrow labels, and clicking the arrow. Confirm modal input and the comparison route remain unchanged.
