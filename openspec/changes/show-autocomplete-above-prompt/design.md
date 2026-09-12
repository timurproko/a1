## Context

See `proposal.md` for the user-visible problem. The current owned editor renders a single array: upper border, visible text, lower border, then autocomplete. `OwnedEditor` adds the bare-A1 prompt prefix around that presentation. The history-enabled editor uses the source-traced local core; the history-disabled editor uses the pinned editor through the owned wrapper.

`OwnedUiSessionShellRoot` bottom-aligns the complete dock. As a result, every menu row below the editor moves the editor upward. The prompt-selection interceptor also assumes text begins immediately after the component's first border, and the shell derives its pointer frame from the whole input component. Those assumptions must be kept coherent with the new order.

## Goals / Non-Goals

**Goals:**
- Make input position independent of menu height by keeping every autocomplete row before the editor body in the bottom-aligned dock.
- Use one explicit editor-body/menu geometry contract for composition, selection, and pointer mapping.
- Retain the existing completion controller, asynchronous lifecycle, list semantics, settings authority, and both history paths.

**Non-Goals:**
- A general popup system, a new selectable-list implementation, reverse-order completion navigation, or a menu-position preference.
- Repositioning settings menus, selectors, dialogs, extension replacement editors, or contextual ghost text.
- Changing the terminal renderer, transcript navigation policy, persistent-history storage, or installed dependency exports.

## Decisions

### 1. Allocate autocomplete upward within the existing dock

The bare-A1 default-editor order becomes:

`existing pre-input dock content → above-editor widgets → autocomplete → upper border → prompt text → lower border → below-editor widgets → footer`

The shell continues to bottom-align this dock. For unchanged non-menu content, adding `m` menu rows decreases the dock's start row by `m` while increasing the editor-body offset by exactly `m`; the editor's terminal row is therefore unchanged. Closing or filtering the list gives rows back to the transcript viewport.

This is preferable to reserving the maximum list height permanently, which wastes transcript space, or drawing an independently positioned overlay, which would introduce overlap, focus, pointer ownership, and damage handling not needed for this request. Above-editor widgets retain their position before the input group; they may move upward with that group's growing menu.

### 2. Model body and menu geometry at the owned editor boundary

Extend the owned editor presentation boundary with typed body/menu information and the body offset used by consumers. Keep the prompt prefix, history labels, scroll indicators, cursor marker, and selection painting attached to the body. Do not infer row ownership by searching for border glyphs, command labels, ANSI styles, or English descriptions in the final shell frame.

The existing owned wrapper already calculates visible editor layout from public logical lines, width, padding, prefix width, and terminal height. Consolidate that geometry rather than introducing another independent approximation. Where the source-traced history core supplies geometry, expose it through its owned typed interface. The pinned-backed path must retain public API use and its existing history semantics; no reflection into private autocomplete state or dependency patch is allowed. Keep any necessary source-traced presentation adaptation inside the established component boundary and reconcile its provenance evidence.

Apply body decoration/selection using body-relative coordinates before final composition, or explicitly translate by the same body offset. Pass the actual body start/end to shell pointer routing. Treat menu rows as non-text dock chrome for pointer sequences; this change does not add pointer-based completion selection.

A raw `unshift` of trailing rows was rejected: it could look right while the prompt prefix, selected text, border indicators, or mouse coordinates remained attached to old row indices.

### 3. Budget menu capacity after non-menu dock layout

Measure the ordinary dock without autocomplete first. Remaining terminal rows, capped by the effective visible-item setting, determine menu capacity. Distinguish choice rows from an optional pagination indicator, using the existing list's selection-aware windowing so the selected choice remains visible. Give the last available row to a choice rather than a counter. Do not simply truncate the start or end of a list and risk removing the active choice.

Capacity is a presentation limit, not a persisted setting change: do not write `autocompleteMaxVisible` while resizing. With zero available menu rows, retain current completion state and key handling without painting it. Restoring capacity renders the current result, never a cached superseded one. Width/height changes must update body/menu geometry and pointer regions together.

### 4. Declare the exception without widening parity tolerance

Enable the changed composition only for bare A1's default editor, independent of persistent history. Keep comparison mode and extension-owned replacement editors on their existing presentation path. All default-editor completion providers share this layout, so command, argument, path/resource, and extension completions cannot diverge.

Comparison evidence should continue to assert candidate content, styles, navigation, completion outcomes, cancellation, and current state. Accept only the declared row-order, capacity, and resulting anchor differences for bare A1; do not normalize away arbitrary rendering differences or modify the untouched producer.

### 5. Validate geometry and behavior, not only row order

Focused tests should compare terminal coordinates across closed, open, filtered, paged, canceled, and asynchronously updated list states. Hold editor layout and non-menu dock content constant for the no-jump assertion. Separately cover genuine reflow from multiline editing and resize.

Use both history modes; command/argument/path/extension completions; Unicode and narrow widths; small heights including one and zero menu rows; live visible-item changes; below/above-editor widgets; prompt selection/copy; extension replacement/restore; and detached or streaming transcripts. Inspect final terminal cells after shrinking and closing to catch stale rows. Fixed-height list navigation must preserve existing dock-only transcript reuse. Maintain an independent `a1 pi`/pinned comparison proving no upstream presentation change.

## Risks / Trade-offs

- **Body/menu geometry drifts between editor paths** → Share owned layout metadata, test persistence on and off, and fail explicit geometry assertions rather than searching styled rows heuristically.
- **Moving rows breaks selection or cursor placement** → Reuse the body offset for all painting and pointer transforms and verify actual terminal cells and copied text.
- **A short terminal hides the active choice** → Use selection-aware capacity limits, omit auxiliary rows first, and test all list positions with one available row.
- **Menu growth changes transcript extent or transient-tail placement** → Keep it dock-owned and use existing viewport reallocation, detached-position clamping, and follow policy; do not freeze transcript geometry artificially.
- **Unrelated work lands before implementation** → Rebase the design against current accepted editor/viewport behavior at apply time; do not revive an older queue or working-status layout while changing autocomplete.

## Migration Plan

There is no data migration or setting change. After this specification is reviewed and merged, implementation will be a separate change stream referencing `show-autocomplete-above-prompt`. Ship only after automated checks and physical-terminal acceptance of the exact build. Reverting the implementation restores the previous placement without changing user data.

Physical review should use the built color-preserving shell entry in Windows Terminal/Git Bash, type `/`, filter and navigate suggestions, press Escape, exercise a multiline draft, and resize the terminal. The typing row must not jump when only the menu changes. The comparison profile should retain its existing below-prompt list.
