## Why

Six adapter members hand raw Pi objects to the session shell, which never inspects them and only forwards them to Pi component factories: the model selector context (`currentModel`, `modelRuntime`, `scopedModels` typed `unknown`), the session selector context (`SessionInfo` loaders), the tree selector context (`tree: unknown[]`), and the three transcript renderer lookups. The shell is a courier because the owner graph forbids `pi-engine-adapter` and `pi-component-adapter` from importing each other and the shell is the only non-composition owner allowed to see both. The multi-agent tab host must not inherit that role.

## What Changes

- Add a new owner `src/integrations/pi/session-presenters` with test root `test/integrations/pi/session-presenters`, allowed to import `pi-engine-adapter`, `pi-component-adapter`, `owned-ui-contracts`, and `presentation-contracts`.
- Declare `OwnedUiSessionPresenters` and `OwnedUiDialogHost` in `src/contracts/owned-ui`; the new owner exports `createPiSessionPresenters(adapter)` implementing the former.
- Move `showModelSelector`, `showSessionSelector`, `showTreeSelector`, and the transcript renderer wiring out of `session-shell.ts` and `session-shell-root.ts` into the new owner; the shell receives presenters through its options from composition.
- Merge the duplicated fifteen-second refresh and timeout logic of `showScopedModelsSelector` and `showModelsDialog` into one presenter helper.
- Delete the transitional `pinned` sub-port introduced by `narrow-owned-ui-backend-port`.
- Register the owner in `scripts/governance/project-structure-policy.mjs`, the owner-id list in `test/repository-governance/project-structure-policy.test.ts`, `config/validation-ownership.json`, and `docs/architecture/project-structure.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: Pi-typed presentation payloads never cross the application layer.

## Impact

No user-visible change. Removes roughly four hundred lines from `session-shell.ts`. Adds one production owner, one test root, and the governance entries above. `src/composition/owned-ui.ts` constructs the presenters and passes them to the shell.
