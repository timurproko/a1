## 1. Separate current-session selection

- [ ] 1.1 Route bare `models` selections through the existing model workflow with persistence disabled, while retaining authenticated lookup, refresh fallback, active-view updates, close-on-success, and failure behavior.
- [ ] 1.2 Update model-switch confirmation and focused engine/shell expectations so Enter changes the active session model without changing the settings manager's persisted provider/model pair or saving pending scope edits.

## 2. Expose the persisted default model

- [ ] 2.1 Add a reviewed supplemental `defaultModel` Agent setting with dynamic authenticated-model choices, first-slash provider/model parsing, exact write validation, `next-session` application, and persistence through Pi's settings manager.
- [ ] 2.2 Keep generated Pi settings inventory checks exact while adding separate fail-closed operation, effect, presentation, and ownership coverage for the supplemental default-model setting.
- [ ] 2.3 Add focused settings-bridge tests for read/write behavior, unavailable values, storage failure rollback, later-session persistence, and no mutation of the active session model or thinking state.

## 3. Add the Settings configuration surface

- [ ] 3.1 Render `Default model` as `configure` in the Agent Settings section and open a keyboard-only searchable model selector using descriptor-supplied models and the owned modal hierarchy.
- [ ] 3.2 Implement default selection, provider/model filtering, exact current-default indication, Enter-to-persist, Escape-without-write, and failed-save state retention without affecting model scope.
- [ ] 3.3 Add focused Settings presentation and interaction coverage for matching and differing active/default models, narrow widths, filtering, keyboard hints, save success/failure, pointer isolation, and return to the Settings list.

## 4. Preserve surrounding contracts

- [ ] 4.1 Keep Space/Ctrl+S scope editing, dirty state, catalog refresh, advanced scope bindings, and the pinned `a1 pi` comparison selectors unchanged in focused regression coverage.
- [ ] 4.2 Update maintained modal/settings inventories, architecture provenance, and affected documentation so current-model switching and default-model configuration are described as separate actions.
