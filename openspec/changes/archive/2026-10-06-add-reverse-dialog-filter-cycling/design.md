## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. Three bare-A1 dialogs currently use Tab as a non-text state transition: Models switches between `all` and `scoped`, Resume Session switches between current-folder and all-session scope, and Session Tree advances through four filters. Models and Resume Session match the configured forward-Tab input action directly, while Session Tree uses an owned forward-cycle action whose bare-A1 default is Tab. Session Tree already has a backward-cycle operation, but its existing binding is not Shift+Tab.

Reverse Tab is intentionally inert in the ordinary bare-A1 agent input. The requested behavior is therefore a modal interaction rule, not a reassignment of the global editor action or an advertised application shortcut.

## Goals / Non-Goals

**Goals:**

- Make Shift+Tab move backward through every dialog state sequence that Tab moves forward through.
- Preserve query text, selected-item restoration, scope loading, folded-tree reset, and other existing transition side effects.
- Recognize the terminal encodings supported by the shared key matcher rather than one literal byte sequence.
- Leave visible dialog hints and ordinary agent-input Shift+Tab behavior unchanged.

**Non-Goals:**

- Add reverse behavior to text search, autocomplete, ordinary form focus, or dialogs where Tab does not cycle a filter.
- Advertise Shift+Tab in modal footers, Keyboard Shortcuts, startup help, or settings.
- Change user-configurable forward-Tab bindings, direct tree-filter bindings, comparison-profile bindings, or filter ordering.

## Decisions

### 1. Treat reverse Tab as a modal-local convenience

Each affected dialog will recognize Shift+Tab before forwarding input to its search control. The implementation may centralize recognition in a small internal modal-input helper, but it will not add a global bare-A1 editor binding. This keeps the ordinary prompt's reserved/inert Shift+Tab contract intact and prevents reverse Tab from becoming a general application shortcut.

Rebinding the ordinary input action was rejected because `tui.input.tab` represents forward Tab and is also used for completion and suggestion acceptance. Adding Shift+Tab to that action would erase direction and alter non-dialog behavior.

### 2. Reuse each dialog's existing transition semantics

Models and Resume Session each have two states, so reverse cycling produces the same destination as forward cycling while preserving their existing selection and asynchronous scope-loading paths. Session Tree will use its existing ordered filter list and backward-cycle behavior, including wrapping from `all` to `labeled`, clearing folded nodes, and restoring the nearest visible selection through the existing filter application path.

Creating a second state machine for reverse input was rejected because it could drift from forward cycling's query, selection, loading, or folding semantics.

### 3. Keep discovery text forward-only

The existing `Tab filter` and `Tab scope` hints remain byte-for-byte unchanged. Shift+Tab is an ergonomic counterpart for users who try the conventional reverse chord, not another footer item. Focused tests will assert both reverse behavior and absence of new Shift+Tab hint text.

Adding `Shift+Tab` beside every forward hint was rejected because it would lengthen already constrained modal footers without being necessary for discoverability.

### 4. Verify modal scope and terminal decoding

Focused component tests will exercise reverse Tab through the shared key-decoding forms already recognized by bare A1. Coverage will show backward wraparound in the four-state Session Tree, state switching in the two-state Models and Resume Session dialogs, preserved query/selection behavior where applicable, unchanged hints, and retained ordinary-editor inertness through the existing shortcut regression.

Testing only a single escape sequence was rejected because terminals can encode modified Tab in multiple supported forms.

## Risks / Trade-offs

- **[Shift+Tab reaches a search input as text or focus movement]** → Intercept it in the dialog action layer before delegating to the input and cover query preservation explicitly.
- **[A global keybinding accidentally changes the ordinary prompt]** → Keep the alias modal-local and retain the existing ordinary-editor reverse-Tab regression.
- **[Two-state dialogs obscure direction mistakes]** → Use the four-state tree to prove backward ordering and use Models/Resume coverage to prove complete surface adoption.
- **[Hints drift to expose the convenience alias]** → Retain exact footer assertions for the existing forward-only wording.

## Migration Plan

No data or configuration migration is required. The behavior is confined to open dialogs and can be rolled back without changing saved filters, scopes, sessions, or keybinding files.
