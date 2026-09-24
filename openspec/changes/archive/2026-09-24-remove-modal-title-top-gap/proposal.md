## Why

Bare-A1 modal frames currently reserve a blank row between the top rule and the title, and their left edges vary between zero, one, and locally authored content indents. The spacing is repeated by individual modal implementations, making dialogs visually inconsistent with A1's full-screen surfaces and allowing chrome geometry to drift between built-in, nested, and extension-hosted surfaces.

## What Changes

- Remove the empty row between a modal's top rule and its title so the title is the first content row in the frame.
- Make title-to-rule spacing and a one-cell global left content inset shared modal-component policy rather than adjusting individual rows in each dialog.
- Apply the shared policy to all A1-authored bare-A1 modal families, including top-level, nested, authentication, startup, and extension-hosted dialogs.
- Keep frame rules full width while placing titles, search/input rows, lists, descriptions, and shortcut rows inside the same global left edge.
- Preserve spacing below the title, relative content indentation, focus, navigation, and the explicit `a1 pi` comparison profile.
- Repair the delivery association lost before PR #573 merged: preserve the immutable merged body, bind the exact integrated implementation to this change through a reviewed corrective record, synchronize and archive the active artifacts, and prevent an unassociated ready PR with an active implementation change from passing again.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Require reusable modal chrome to place a title directly below its top rule and apply one global left content inset while leaving rules full width.
- `owned-pi-ui-foundation`: Require every A1-authored bare-A1 modal branch to receive compact, consistently inset geometry through the shared component boundary.
- `change-delivery-workflow`: Fail closed when a ready implementation candidate carries active OpenSpec delivery content without valid association metadata, and define an exact corrective association for the already-integrated exception.
- `local-worktree-cleanup`: Permit cleanup of the original retained worktree only after the corrective association, archive, canonical specs, CI, merge provenance, and remote-ref absence are all verified.

## Impact

The modal implementation already integrated in PR #573 and was manually verified, but its editable PR body lost the required machine association before merge. Corrective implementation will affect trusted readiness/finalization policy, exact association evidence, local cleanup verification, canonical specification synchronization, and archival of this still-active change. Dialog wording, title styling, vertical body spacing, controller transitions, installed Pi package code, persisted data, and `a1 pi` output remain unchanged.
