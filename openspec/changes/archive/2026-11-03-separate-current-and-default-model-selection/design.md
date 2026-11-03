## Context

Bare A1 replaced Pi's separate model and scoped-model selectors with one `/models` dialog. Its Enter path currently calls the model workflow with persistence enabled, so selecting a model updates both the active session and Pi's stored `defaultProvider`/`defaultModel`. The dialog already has a different persistence action, Ctrl+S, but that action belongs only to model cycling scope.

The owned Settings screen already presents a searchable two-step configuration dialog for per-model thinking defaults. Pi's settings manager also exposes direct default-model getters and `setDefaultModelAndProvider`, but the owned Agent settings bridge does not currently expose that setting.

## Goals / Non-Goals

**Goals:**

- Make `/models` Enter an explicit current-session switch only.
- Give the persisted default model a dedicated, discoverable Settings configuration surface.
- Persist the default through Pi's settings manager without changing the active session model or its current thinking state.
- Reuse the authenticated runtime model catalog and the owned Settings modal hierarchy.
- Preserve model scope, refresh, error, and comparison-profile behavior.

**Non-Goals:**

- Changing model cycling scope semantics, Ctrl+S scope persistence, provider authentication, or catalog ownership.
- Adding a second default-model action or save shortcut to the Models dialog.
- Changing startup fallback when the saved default is unavailable or unauthenticated.
- Changing the pinned `a1 pi` model selector or its existing select-as-default behavior.

## Decisions

### 1. Treat Models-dialog Enter as a non-persistent session switch

The bare `models` workflow will use the existing authoritative model-selection path with persistence disabled. It will still resolve against the authenticated catalog, perform bounded refresh on a miss, call the session's model setter, update active-model view state, apply the model's ordinary thinking-level policy, and close only after success. Its confirmation will identify a model switch rather than a default-model change.

The comparison `model` workflow keeps its request-controlled persistence behavior. Reusing the common selection path avoids a second model mutation implementation while making persistence an explicit caller decision.

Keeping persistence on Enter was rejected because it is the reported defect. Adding another Models-dialog shortcut for the default was rejected because the requested default authority belongs in Settings and Ctrl+S already has scope semantics.

### 2. Expose the default model as a deferred Agent setting

Add a `defaultModel` Agent setting backed by Pi's existing `getDefaultProvider`, `getDefaultModel`, and `setDefaultModelAndProvider` APIs. Its stored value is the canonical `provider/modelId` reference. The available choices are resolved from the authenticated model catalog when settings are read, so unauthenticated or stale catalog entries are not offered.

The setting declares `next-session` application and startup ownership: accepting the value completes the persistence operation, while the next session startup observes it through the existing resolver. An authenticated saved default is the initial model even when it is outside `enabledModels`; the resolved scoped list remains unchanged so model cycling still follows the user's scope. It needs no live owner handler and must never call `session.setModel`, update the active-model port, or change the active session's thinking level.

Model identifiers may contain slashes, so writes split only at the first slash. A selected value must exactly match an available catalog model before persistence.

### 3. Give `Default model` a dedicated searchable Settings dialog

The owned Settings list will render the Agent `defaultModel` row as `configure` immediately above the structured per-model thinking row, while retaining the actual stored scalar value in the backend contract. Activating the row opens a keyboard-only model selector with an accent title, a muted instruction, the shared ASCII search prompt, Models-dialog-style `modelId [provider]` rows, and standard search/navigation/select/close hints.

The selector starts on the persisted default when it is available, filters by model id, name, provider, and full reference, and marks the persisted default with one success-colored checkmark immediately after `[provider]`. The display name remains searchable metadata rather than a duplicate row column. Enter closes the selector immediately and starts the selected full-reference write through the Agent settings port in the background, so no saving screen delays the return to Settings. Escape closes without writing. A failed write reopens the preserved selector and leaves the previous default authoritative while the existing Settings failure channel reports the error.

Reusing the generic scalar value menu was rejected because it is not searchable and does not scale to model catalogs. Encoding the default as a synthetic JSON flag record was rejected because the persisted value is intrinsically one scalar model reference and the settings contract should represent it truthfully.

### 4. Keep current and default indicators independent

The Models dialog's success checkmark continues to identify the active session model only. The Settings default-model selector identifies the persisted default only. Neither surface infers the other state, so a user can intentionally run one model in the current session while retaining another startup default.

Pending unsaved scope edits remain session-only when Enter switches models, exactly as before. Changing the default in Settings does not save or alter model scope.

### 5. Preserve generated Pi settings provenance while declaring the supplemental selector

Pinned settings metadata remains authoritative for Pi's ordinary generated settings list. The default-model entry is a narrowly declared supplemental Pi setting because Pi exposes it through its model selector rather than the generated settings rows. Inventory checks will distinguish generated entries from this reviewed supplement while still requiring an operation, effect owner, application boundary, presentation label, and focused evidence for every exposed key.

This avoids pretending the upstream generated list contains a row it does not contain, while retaining fail-closed drift checks for both generated and supplemental settings. The supplemental persistence module is loaded only when settings are listed, read, or written so the startup graph does not grow for a configuration surface that is not used during launch.

## Risks / Trade-offs

- **[Risk] A default-model write could accidentally reuse the live model workflow.** → Back the setting directly with the settings manager and assert the session model, active-model view, and thinking level do not change.
- **[Risk] Dynamic catalogs can change while Settings is open.** → Resolve descriptor choices when settings are loaded, validate exact membership again on write, and preserve the selected/query state on a failed save.
- **[Risk] Adding a supplemental setting can weaken generated-metadata drift checks.** → Keep generated and supplemental inventories separate and require exact coverage for each.
- **[Risk] Current and default markers can be conflated in tests or presentation.** → Cover sessions where active and default match and where they differ, in both Models and Settings surfaces.
- **[Trade-off] Default-model configuration moves one action deeper into Settings.** → The action becomes explicit and discoverable as `Default model  configure`, avoiding accidental persistence during routine switching.

## Migration Plan

1. Add the deferred default-model setting operation, inventory declaration, dynamic catalog choices, and settings write path.
2. Add the dedicated owned Settings selector and route the `Default model` row to it.
3. Change bare `/models` selection to non-persistent switching and update its confirmation behavior.
4. Update focused engine, shell, Settings, modal-inventory, and comparison-isolation coverage.
5. Roll back by reverting the change; existing `defaultProvider` and `defaultModel` values require no transformation.
