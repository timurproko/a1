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
- Replacing either editor implementation, adding a menu-capacity budget, changing list minimums, or introducing one-row/zero-capacity behavior for tiny terminals.

## Decisions

### 1. Allocate autocomplete upward within the existing dock

The bare-A1 default-editor order becomes:

`existing pre-input dock content → above-editor widgets → autocomplete → upper border → prompt text → lower border → below-editor widgets → footer`

The shell continues to bottom-align this dock. For unchanged non-menu content, adding `m` menu rows decreases the dock's start row by `m` while increasing the editor-body offset by exactly `m`; the editor's terminal row is therefore unchanged. Closing or filtering the list gives rows back to the transcript viewport.

This is preferable to reserving the maximum list height permanently, which wastes transcript space, or drawing an independently positioned overlay, which would introduce overlap, focus, pointer ownership, and damage handling not needed for this request. Above-editor widgets retain their position before the input group; they may move upward with that group's growing menu.

### 2. Model body and menu geometry at the owned editor boundary

Extend the owned editor presentation boundary with typed body/menu information and the body offset used by consumers. Keep the prompt prefix, history labels, scroll indicators, cursor marker, and selection painting attached to the body. Do not infer row ownership by searching for border glyphs, command labels, ANSI styles, or English descriptions in the final shell frame.

The existing owned wrapper already calculates visible editor layout from public logical lines, width, padding, prefix width, and terminal height. Reuse that body-boundary information to separate the already-rendered body and trailing menu rows, then move the complete menu block before the body. Consolidate the geometry used by prefix, selection, and pointer handling rather than introducing another independent approximation. Preserve source attribution and test boundary cases such as wrapping, scroll indicators, and paste chips.

This does not require access to the private completion list, its selected index, or its windowing logic: those remain owned by the current editor, and its menu rows are moved without re-rendering individual choices. Keep the pinned-backed history-disabled path and the local history-enabled path. Do not replace either editor, inspect private autocomplete state, or patch a dependency.

Apply body decoration/selection using body-relative coordinates before final composition, or explicitly translate by the same body offset. Pass the actual body start/end to shell pointer routing. Treat menu rows as non-text dock chrome for pointer sequences; this change does not add pointer-based completion selection.

Reordering rows without updating their body offset was rejected: it could look right while the prompt prefix, selected text, border indicators, or mouse coordinates remained attached to old row indices.

### 3. Preserve menu sizing rather than introduce a new clipping policy

Move the existing menu as a block, including its existing pagination row. Keep the current item limit, selection window, setting-application behavior, and terminal clipping policy. Resize updates the same layout and pointer offsets as before; it does not compute a new completion-item budget or write `autocompleteMaxVisible`.

The earlier proposal's selection-aware one-row clipping and special zero-capacity handling were extra requirements, not necessary for the requested placement change. They are removed, not deferred implementation tasks. Accessing private list state or replacing the history-disabled editor to support those extras would enlarge the change for no user-requested benefit.

### 4. Declare the exception without widening parity tolerance

Enable the changed composition only for bare A1's default editor, independent of persistent history. Keep comparison mode and extension-owned replacement editors on their existing presentation path. All default-editor completion providers share this layout, so command, argument, path/resource, and extension completions cannot diverge.

Comparison evidence should continue to assert candidate content, styles, navigation, completion outcomes, cancellation, and current state. Accept only the declared row-order and resulting anchor differences for bare A1; do not normalize away arbitrary rendering differences or modify the untouched producer.

### 5. Validate geometry and behavior, not only row order

Focused tests should compare terminal coordinates across closed, open, filtered, paged, canceled, and asynchronously updated list states. Hold editor layout and non-menu dock content constant for the no-jump assertion. Separately cover genuine reflow from multiline editing and resize.

Use both existing editor paths as regression coverage, not as a history redesign. Cover command/argument/path/extension completions; Unicode and narrow widths; resize under the existing clipping rules; existing visible-item setting behavior; below/above-editor widgets; prompt selection/copy; extension replacement/restore; and detached or streaming transcripts. Inspect final terminal cells after shrinking and closing to catch stale rows. Fixed-height list navigation must preserve existing dock-only transcript reuse. Maintain an independent `a1 pi`/pinned comparison proving no upstream presentation change.

## Risks / Trade-offs

- **Body/menu geometry drifts between editor paths** → Share owned layout metadata, test persistence on and off, and fail explicit geometry assertions rather than searching styled rows heuristically.
- **Moving rows breaks selection or cursor placement** → Reuse the body offset for all painting and pointer transforms and verify actual terminal cells and copied text.
- **A short terminal clips menu content** → Preserve the existing terminal policy and ensure row movement does not introduce stale cells or incorrect pointer regions; a new tiny-terminal menu policy is outside this change.
- **Menu growth changes transcript extent or transient-tail placement** → Keep it dock-owned and use existing viewport reallocation, detached-position clamping, and follow policy; do not freeze transcript geometry artificially.
- **Unrelated work lands before implementation** → Rebase the design against current accepted editor/viewport behavior at apply time; do not revive an older queue or working-status layout while changing autocomplete.

## Migration Plan

There is no data migration or setting change. After this specification is reviewed and merged, implementation will be a separate change stream referencing `show-autocomplete-above-prompt`. Ship only after automated checks and physical-terminal acceptance of the exact build. Reverting the implementation restores the previous placement without changing user data.

Physical review should use the built color-preserving shell entry in Windows Terminal/Git Bash, type `/`, filter and navigate suggestions, press Escape, exercise a multiline draft, and resize the terminal. The typing row must not jump when only the menu changes. The comparison profile should retain its existing below-prompt list.
