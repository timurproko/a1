## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The owned editor subclass in `src/integrations/pi/components/upstream/components/owned-editor.ts` already intercepts `app.interrupt`: with no menu open it runs the shell interrupt handler, otherwise it defers to the pinned editor, whose `tui.select.cancel` branch only closes the list. The pinned editor's `setText` already cancels autocomplete, resets history browsing, and notifies `onChange`, so clearing the prompt after a cancellation needs no private state access.

## Goals / Non-Goals

**Goals:**

- Return to the empty prompt when Escape dismisses a sole top-level slash-command search in bare A1.
- Keep every other Escape path, including the `a1 pi` comparison profile, byte-identical to pinned Pi.
- Record the deviation where the source ledger and specification already declare bare-A1 editor exceptions.

**Non-Goals:**

- Changing the interrupt handler, the clear/exit chord, keybindings, or menu placement.
- Clearing argument, path, resource, or extension-provider searches.
- Touching pinned Pi packages or the history editor state machine.

## Decisions

### 1. Decide in the owned subclass from public editor state

`isTopLevelCommandSearch()` reads `isShowingAutocomplete()`, `getText()`, and `getCursor()`: the text must match `^/[^\s/]*$` and the cursor must sit at its end on line 0. This mirrors the v2 hotkey rule without reaching into the private `autocompletePrefix`; the owned class already owns the `app.interrupt` branch, so the check slots in before the pinned fallback. Patching `handleInput` from outside, as v2 did, is rejected because A1 owns the subclass and a wrapper would bypass the subclass's other interception order.

### 2. Gate the behavior with an explicit construction option

`OwnedEditorOptions.clearCommandSearchOnEscape` defaults to off; `createPiShellEditor` sets it only for the `a1` keybinding profile, alongside the other bare-A1-only options. The comparison profile therefore keeps pinned cancellation, and the existing parity test that drives Escape through both editors stays byte-identical. Keying on the presence of the input presentation is rejected because tests and hosts construct bare A1 without it.

### 3. Clear through the public `setText`

`setText("")` cancels the menu, drops history browsing, pushes an undo snapshot, and emits `onChange("")`, so bash-mode border color and contextual suggestions update through their existing paths. Calling the private `cancelAutocomplete` plus a manual state reset is rejected as duplicated pinned logic.

## Risks / Trade-offs

- **[Risk] Users who typed a partial command lose it on Escape.** → Only a single-line command search with the cursor at its end is cleared; any argument text, nested path, or multi-line content keeps the pinned close-only behavior, and the cleared text remains reachable through undo.
- **[Risk] The comparison profile drifts from pinned Pi.** → The option is set only for the `a1` profile and a focused test asserts the `pi` profile keeps its text.
- **[Trade-off] One more bare-A1 exception in the owned editor.** → It is declared in the source ledger and specification like the existing frame and placement exceptions.

## Migration Plan

No data or configuration migration is required. Rollback is the ordinary code revert.
