## Context

The owned shell presents dialogs through several component families: A1-owned Thinking, Skills, and Models dialogs; adapted pinned selectors and authentication flows; runtime overlays; and extension-hosted selectors, confirmations, inputs, and editors. Most adapted selectors resolve `tui.select.cancel`, whose current effective label includes Escape and Ctrl+C, while a few A1-owned components hand-match Escape or give Ctrl+C a filter-clearing meaning. Their footer hints are assembled independently from the same effective key labels or from hardcoded `Esc` entries.

This creates two forms of drift. Ctrl+C does not reliably reach the active dialog's cancel callback, and dialogs that already accept it may advertise the alias even though the desired compact vocabulary is only `Esc` or `Escape` plus `close`/`cancel`.

## Goals / Non-Goals

**Goals:**
- Make one Ctrl+C press immediately close every dismissible dialog through its existing cancel lifecycle.
- Ensure dialog-local input, nested state, overlays, and extension surfaces cannot leak Ctrl+C to the underlying editor or application interrupt handler.
- Keep Ctrl+C absent from dialog shortcut hints while retaining the existing advertised Escape spelling and action wording.
- Preserve disposal, focus restoration, silent cancellation, and parent-surface restoration.

**Non-Goals:**
- Rebinding or removing Ctrl+C from the ordinary agent editor, reference screens, Settings, or other non-dialog applications.
- Changing configurable keybinding precedence or rewriting a user's keybinding file.
- Changing Enter, Space, navigation, save, filtering, selection, or nested-back behavior.
- Adding a new visible hint, command, setting, or public component contract.

## Decisions

### 1. Enforce Ctrl+C at the owned dialog boundary

The dialog adapter boundary will recognize the raw Ctrl+C terminal input before a dialog's text input or local keybinding handler and invoke that surface's existing cancel callback. Dialog constructors already receive cancellation callbacks from the session shell or extension bridge, so the alias can share established cleanup and restoration rather than synthesizing Escape text or adding another lifecycle.

This boundary will cover replacement-input dialogs and overlays, including nested and extension-hosted surfaces. Component-specific handlers that currently clear a filter or ignore Ctrl+C will no longer take precedence over closing.

Alternative: add a Ctrl+C comparison to each component. Rejected because the modal inventory is intentionally broad and per-component edits would remain easy to omit as new dialog families are added.

Alternative: globally translate Ctrl+C to Escape in the terminal runtime. Rejected because that would alter editor interrupts, full-screen applications, and surfaces where Escape has a different meaning.

### 2. Keep the alias out of semantic dialog hints

The shared modal-hint adaptation will omit Ctrl+C from cancellation key labels before semantic key/action rendering. It will preserve the remaining Escape/Esc spelling, action text, spacing, styling, clipping, and entry boundaries. The dispatch alias is intentionally a conventional escape hatch rather than another advertised control.

Alternative: leave `Escape/Ctrl+C` in components whose effective cancel declaration contains both keys. Rejected because it contradicts the requested compact hint treatment and perpetuates presentation differences between dialog families.

### 3. Prove inventory-wide routing with representative boundary tests

Focused tests will cover an A1-owned hand-matched dialog, a searchable dialog with nonempty input, an adapted pinned selector, a nested modal state, an overlay, and an extension-hosted surface. Assertions will verify one Ctrl+C closes, invokes cancel once, does not select or submit, restores focus/surface state, and leaves no transcript cancellation row. Rendering assertions will verify dialog shortcut rows contain Escape/Esc but not Ctrl+C.

The session-shell boundary tests will also verify Ctrl+C retains its existing editor behavior when no dialog owns input. This guards the ownership distinction more directly than duplicating the same assertion in every component fixture.

## Risks / Trade-offs

- [A boundary wrapper could cancel a nondismissible progress surface] → Apply it only where the constructor/controller supplies a dialog cancel lifecycle, not to every replacement component.
- [Nested dialogs could restore the wrong parent] → Invoke the exact existing cancel callback for the active surface and cover nested restoration explicitly.
- [Filtering key labels could hide Ctrl+C from unrelated actions] → Restrict suppression to dialog cancellation/close hints and retain semantic entry boundaries.
- [Custom cancel bindings could be weakened] → Preserve normal `tui.select.cancel` dispatch; Ctrl+C is an additional fixed dialog alias, not a replacement.
- [Pinned comparison behavior could drift outside dialogs] → Keep adaptation at the dialog boundary and assert ordinary editor Ctrl+C remains unchanged.

## Implementation Evidence

To be completed during implementation.

## Migration Plan

No data or settings migration is required. Rollback removes the dialog-boundary alias and restores the previous hint labels without affecting persisted state.
