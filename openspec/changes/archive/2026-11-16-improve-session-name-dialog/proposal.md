## Why

Renaming a session starts from an empty field even when a name already exists, and the name dialog lacks the prompt editor's familiar selection and clipboard controls. Users should be able to edit the current name rather than reconstruct it.

## What Changes

- Prefill bare-A1's argument-free `/name` dialog with the current session name, or an empty value for an unnamed session.
- Support mouse text selection, Ctrl+A select all, Ctrl+Z undo, Ctrl+X cut, Ctrl+C copy, and Ctrl+V paste in the name field.
- Match the ordinary prompt editor's selection colors without adding shortcut hints to the dialog footer.
- Give selected-text copying precedence over Ctrl+C dismissal only in the name dialog; retain silent Ctrl+C dismissal when no text is selected.
- Preserve Enter submission, Escape cancellation, whitespace-only dismissal, naming normalization, retained prompt drafts, unrelated dialogs, and the comparison profile.
- Make the bare-A1 footer session-name span hoverable and expose a right-click `Edit` context menu that opens the same prefilled dialog without submitting or clearing a retained prompt draft or attachments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: prompted session naming becomes prefilled and editable with prompt-consistent selection and clipboard behavior, with a scoped exception to the implicit Ctrl+C close alias.

## Impact

- Session shell naming route, neutral input options, and footer-name pointer/context-menu routing.
- Pi component adapter for the compact name input, pointer routing, clipboard services, and shared prompt selection styling.
- Focused shell and component tests; no naming persistence, data migration, or upstream dependency changes.
