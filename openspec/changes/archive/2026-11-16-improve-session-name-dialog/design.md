## Context

The bare-A1 argument-free name route in `src/app/session-shell/session-shell.ts` calls the internal extension input bridge without an initial value. The adapted `ExtensionInputComponent` already accepts `initialValue`, but the internal bridge contract does not expose it. Its pinned single-line `Input` does not provide the owned prompt editor's complete mouse-selection and clipboard experience. Dialog and component wrappers also enforce an implicit Ctrl+C cancel alias before field handling.

## Goals / Non-Goals

Goals:
- Edit a snapshot of the actual current session name with the caret initially at the end.
- Provide mouse drag selection and the requested editing shortcuts in the compact single-line field.
- Use the ordinary prompt's actual selection paint, including active theme changes.
- Keep the footer limited to its existing Enter and Escape guidance.

Non-goals:
- Change direct naming, generated naming, normalization, persistence, or the comparison profile.
- Enable these behaviors for every extension input or searchable dialog.
- Add multiline input, prompt history, autocomplete, image paste, or new shortcut settings.

## Decisions

### Prefill through explicit internal options

Extend the neutral internal input bridge options to carry an initial value and an explicit name-editing mode. Pass the current session name from the shell at dialog invocation, without detecting a title string or duplicating naming policy in the component. Keep public extension inputs on their existing behavior. Initial text is a baseline, not an undoable user edit.

### Keep a compact single-line field with reusable editing behavior

Retain the existing modal frame, title, input marker, and submit/close footer. Reuse the owned prompt's existing clipboard services and selection paint where practical; extract a narrowly scoped shared helper only if both production consumers need it. Do not expose the ordinary multiline prompt's history, autocomplete, attachment, or submit machinery in the dialog.

Selection, replacement, deletion, cut, paste, and undo must operate on text boundaries rather than terminal byte offsets. Pointer mapping must account for the modal inset, input marker, wide graphemes, horizontal scrolling, clipping, and resize. Keep drag/release ownership in the field without selecting the underlying transcript. Replacing selected text or pasting should be undoable back to the previous field value. Clipboard text stays single-line and follows existing text-input sanitation and bounds.

### Scope Ctrl+C precedence to selected name text

When a nonempty name-field selection exists, consume Ctrl+C as copy without submission, mutation, cancellation, or propagation. When no selection exists, retain the dialog's silent Ctrl+C cancellation. Carry this capability explicitly through any cancel wrappers that otherwise intercept the chord. All unrelated dialogs retain their existing unconditional Ctrl+C close behavior. Escape always closes without saving.

### Preserve workflow and prompt lifecycle

Accepted non-whitespace text continues through the existing direct naming workflow. Escape, unselected Ctrl+C, and whitespace-only submission preserve the stored name and restore the ordinary prompt and its draft/attachments. Resolve clipboard operations against the owning live field so delayed reads cannot edit a disposed dialog or its replacement.

## Risks / Trade-offs

- Multiple cancel wrappers can intercept copy: cover the complete shell input route, not just a direct component call.
- Pointer offsets differ from the main prompt: cover framed geometry and scrolled/wide input explicitly.
- Shared selection helpers can affect prompt painting: retain prompt regression assertions and keep behavior opt-in.
- Clipboard availability differs by terminal: reuse existing clipboard adapters and bracketed-paste handling rather than introducing a new backend.

### Open naming from the footer without submitting the prompt

The user-requested refinement adds a third outcome: the bare-A1 status/footer session-name span highlights on hover and a right-click opens a context menu containing `Edit`. Choosing `Edit` invokes the same name workflow directly rather than submitting `/name` through the prompt. Retain the current draft, cursor/selection where supported, and attachment state while the menu and dialog own input; cancelling either surface restores ordinary prompt focus without sending or clearing it. Bound hit testing to the rendered name span, including clipping and resize; do not treat the whole footer or adjacent model/status text as the name. Unnamed sessions have no name target, and comparison behavior remains unchanged. Keep the menu inside terminal bounds and use established context-menu presentation and pointer ownership.

Historical style reference: the parent of pivot commit `9f0307c0` retained popup painting in `native/terminal-host/src/roles/attach.rs` and geometry/state in `native/terminal-host/src/core/attach/mod.rs`. Its popup is borderless, has one-cell horizontal padding, a solid dark grey resting background (RGB 38/38/38), normal white actionable labels, and an accent-selected hover background without label recoloring or bolding. It opens with no row highlighted, anchors next to its control (above a bottom bar), clamps horizontally, consumes menu input, and dismisses on outside click or Escape. Reproduce this visual treatment in the present TypeScript owned UI; do not restore the retired native host or its hard-coded accent table. Use the current live `selectedBg` role for hover. The footer-name hover uses that same subtle background, preserving its ordinary foreground.

## Delivery

Three implementation outcomes, in order: current-name prefill; name-field editing and selection; footer-name hover and right-click Edit. Focused tests accompany each outcome. The third outcome is the explicit user-requested scope refinement after implementation began. No migration is required.
