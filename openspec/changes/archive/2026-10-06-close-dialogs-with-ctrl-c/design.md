## Context

The owned shell presents dialogs through several component families: A1-owned Thinking, Skills, and Models dialogs; adapted pinned selectors and authentication flows; runtime overlays; and extension-hosted selectors, confirmations, inputs, and editors. Most adapted selectors resolve `tui.select.cancel`, whose current effective label includes Escape and Ctrl+C, while a few A1-owned components hand-match Escape or give Ctrl+C a filter-clearing meaning. Their footer hints are assembled independently from the same effective key labels or from hardcoded `Esc` entries.

This creates two forms of drift. Ctrl+C does not reliably reach the active dialog's cancel callback, and dialogs that already accept it may advertise the alias even though the desired compact vocabulary is only `Esc` or `Escape` plus `close`/`cancel`. The same mismatch exists in route-hosted Settings and reference screens: they are dismissible full-screen surfaces, but their declared close-on-interrupt policy is not enforced and one Ctrl+C arms an exit chord instead of closing the screen.

## Goals / Non-Goals

**Goals:**
- Make one Ctrl+C press immediately close every dismissible dialog and owned full-screen application through its existing close lifecycle.
- Ensure dialog-local input, Settings nested state, overlays, extensions, and route applications cannot leak Ctrl+C to the underlying editor or application exit chord.
- Keep Ctrl+C absent from close shortcut hints while retaining the existing advertised Escape spelling and action wording.
- Preserve disposal, focus restoration, silent cancellation, and parent-surface restoration.

**Non-Goals:**
- Rebinding or removing Ctrl+C from the ordinary agent editor, terminal surface, comparison profile, or application hosts that do not opt into close-on-interrupt behavior.
- Changing configurable keybinding precedence or rewriting a user's keybinding file.
- Changing Enter, Space, navigation, save, filtering, selection, or nested-back behavior.
- Adding a new visible hint, command, setting, or public component contract.

## Decisions

### 1. Enforce Ctrl+C at owned dismissible-surface boundaries

The dialog adapter boundary will recognize the raw Ctrl+C terminal input before a dialog's text input or local keybinding handler and invoke that surface's existing cancel callback. Dialog constructors already receive cancellation callbacks from the session shell or extension bridge, so the alias can share established cleanup and restoration rather than synthesizing Escape text or adding another lifecycle.

This boundary will cover replacement-input dialogs and overlays, including nested and extension-hosted surfaces. Component-specific handlers that currently clear a filter or ignore Ctrl+C will no longer take precedence over closing.

The owned application host will separately enforce its existing `closeOnInterrupt` policy before dispatching input into an app. Route-hosted Settings, Changelog, Keyboard Shortcuts, and Session Info screens opt into that policy, so one Ctrl+C will invoke the same host close lifecycle as Escape even when Settings has a filter, menu, or structured editor open. Hosts that do not opt in retain their existing app-consumption and interrupt-chord behavior.

Alternative: add a Ctrl+C comparison to each component or full-screen app. Rejected because both inventories are intentionally broad and per-component edits would remain easy to omit as new surface families are added.

Alternative: globally translate Ctrl+C to Escape in the terminal runtime. Rejected because that would alter editor interrupts, non-dismissible full-screen applications, and surfaces where Escape has a different meaning.

### 2. Keep the alias out of semantic dialog hints

The shared modal-hint adaptation will omit Ctrl+C from cancellation key labels before semantic key/action rendering. It will preserve the remaining Escape/Esc spelling, action text, spacing, styling, clipping, and entry boundaries. The dispatch alias is intentionally a conventional escape hatch rather than another advertised control.

Alternative: leave `Escape/Ctrl+C` in components whose effective cancel declaration contains both keys. Rejected because it contradicts the requested compact hint treatment and perpetuates presentation differences between dialog families.

### 3. Prove inventory-wide routing with representative boundary tests

Focused tests will cover an A1-owned hand-matched dialog, a searchable dialog with nonempty input, an adapted pinned selector, a nested modal state, an overlay, an extension-hosted surface, Settings, and the shared reference-screen family. Assertions will verify one Ctrl+C closes, invokes cancel once, does not select or submit, restores focus/surface state, and leaves no transcript cancellation row. Rendering assertions will verify close shortcut rows contain Escape/Esc but not Ctrl+C.

The host and session-shell boundary tests will also verify Ctrl+C retains its existing editor and non-opted-in application behavior when no dismissible surface owns input. This guards the ownership distinction more directly than duplicating the same assertion in every component fixture.

## Risks / Trade-offs

- [A boundary wrapper could cancel a nondismissible progress surface] → Apply it only where the constructor/controller supplies a dialog cancel lifecycle, not to every replacement component.
- [Nested dialogs could restore the wrong parent] → Invoke the exact existing cancel callback for the active surface and cover nested restoration explicitly.
- [Filtering key labels could hide Ctrl+C from unrelated actions] → Restrict suppression to dialog cancellation/close hints and retain semantic entry boundaries.
- [Custom cancel bindings could be weakened] → Preserve normal `tui.select.cancel` dispatch; Ctrl+C is an additional fixed dialog alias, not a replacement.
- [Pinned comparison or non-dismissible application behavior could drift] → Enforce full-screen closing only when the owned host explicitly opts into `closeOnInterrupt`, and assert ordinary editor and non-opted-in host behavior remains unchanged.

## Implementation Evidence

- The owned keybinding manager now keeps Ctrl+C as an unconditional `tui.select.cancel` match while omitting it from displayed cancel-key lists; explicit configured cancel keys continue to dispatch and render normally.
- Thinking, Models, and scoped-model dialogs use the shared cancel action, so a populated search no longer consumes the first Ctrl+C and the established cancel callback runs immediately.
- Extension-hosted custom replacement and overlay surfaces receive the same implicit Ctrl+C cancellation at their owned bridge boundary without forwarding the input to extension content.
- The owned application host now enforces `closeOnInterrupt` before app-local input, so Settings—including an active filter—and the Changelog, Keyboard Shortcuts, and Session Info reference screens close on one Ctrl+C without arming or invoking the application exit chord.
- Focused component, host, composition, and integrated session-shell coverage passes 333 tests across twenty-two suites, including populated searches, Thinking, Skills, Login, Project Trust, nested resume/tree/name flows, extension overlays, raw-input routing for full-screen close-on-interrupt apps, Settings, reference screens, canonical close guidance, Session selector presentation, and value-menu highlighting.
- Build, source/bin typechecking, architecture and provenance checks, changed-file code-documentation governance, docs-sensitive governance, strict owned-spec validation, and `git diff --check` pass after reconciling `origin/develop` at `dd68a357`.
- No implementation gaps are known. Interactive terminal review of representative built-in, nested, extension, Settings, Changelog, and Keyboard Shortcuts surfaces remains the maintainer-controlled acceptance activity.

## Migration Plan

No data or settings migration is required. Rollback removes the dialog-boundary alias and restores the previous hint labels without affecting persisted state.
