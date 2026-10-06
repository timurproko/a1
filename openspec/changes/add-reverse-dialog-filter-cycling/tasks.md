## 1. Add reverse filter cycling

- [ ] 1.1 Add modal-local Shift+Tab recognition without assigning reverse Tab to the ordinary bare-A1 agent input or changing configurable forward-Tab behavior.
- [ ] 1.2 Route Shift+Tab through the Models dialog's existing filter transition while preserving query and selected-model restoration.
- [ ] 1.3 Route Shift+Tab through Resume Session's existing current-folder/all scope transition while preserving search, selection, loading, and cancellation behavior.
- [ ] 1.4 Route Shift+Tab through Session Tree's existing backward filter cycle with wraparound, folded-state reset, and selection restoration.

## 2. Preserve presentation and boundaries

- [ ] 2.1 Keep Models, Resume Session, and Session Tree shortcut hints unchanged and forward-only, with no Shift+Tab hint added.
- [ ] 2.2 Add focused regressions for supported reverse-Tab encodings, backward tree ordering, two-state transitions, preserved dialog state, and inert ordinary-editor Shift+Tab behavior.

## 3. Validate the delivered behavior

- [ ] 3.1 Run the focused dialog, shortcut, governance, typecheck, and build scopes permitted by repository policy; record results and explicit gap disposition in `evidence/validation.md`.
- [ ] 3.2 Build the interactive candidate and provide a color-preserving bare-A1 handoff covering forward and reverse cycling in Models, Resume Session, and Session Tree.
