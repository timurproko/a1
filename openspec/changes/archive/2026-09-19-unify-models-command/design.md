## Context

See `proposal.md` for motivation. Bare A1 currently exposes pinned `/model` and `/scoped-models` workflows through one shared route catalog. Model selection uses Pi's `ModelSelectorComponent`; scope editing uses the separately ported `ScopedModelsSelectorComponent`. The shell owns both controller lifecycles, while the engine adapter owns authenticated model discovery, active-model changes, session scope, settings persistence, and bounded catalog refresh.

`D:/Backups/pi/v2/models/index.ts` is the behavioral reference for the unified interaction: one Models dialog, `all`/`scoped` filters, search, Enter to switch, Space to scope, and Ctrl+S to save. The repository also requires the `a1 pi` comparison profile to preserve pinned commands and surfaces, and requires a declared replacement to retain every capability of the routes it supersedes.

## Goals / Non-Goals

**Goals:**

- Give bare A1 one model-management entry point and one stateful dialog.
- Preserve the engine adapter as the sole authority for available models, active-model changes, session scope, and settings writes.
- Preserve the comparison profile and existing extension-facing public contracts.
- Retain advanced scoped-model operations through their existing effective bindings while adopting the compact v2 dialog presentation.
- Make dirty state and active-model state unambiguous at the exact requested positions.

**Non-Goals:**

- Changing Ctrl+P cycling semantics, provider authentication, model reasoning-level clamping, or catalog ownership.
- Modifying installed Pi packages or deep-importing private Pi components.
- Giving `/models` compatibility aliases under `/model` or `/scoped-models` in bare A1.
- Changing the pinned `a1 pi` command catalog or its model dialogs.

## Decisions

### 1. Split bare and comparison command catalogs at the owned workflow boundary

Keep the pinned route list (`model`, `scoped-models`) for the comparison profile and introduce an owned bare-A1 route (`models`) that requires the same `models.read` and `models.write` capabilities. Slash-command autocomplete, command parsing, and model-selection shortcut dispatch will select the catalog for the active product mode.

This avoids globally renaming pinned routes, which would invalidate comparison behavior. A global replacement was rejected because the canonical specs require `a1 pi` to remain an untouched oracle. Bare aliases were rejected because the requested command surface explicitly replaces the two old names.

### 2. Add one A1-owned unified component instead of modifying either pinned component

Create a typed Models component behind `shell-selectors-dialogs.ts`. Its behavior will be adapted from the v2 reference but implemented against the repository's public `#pi-tui` component boundary and owned theme/facade contracts. It will not modify `ModelSelectorComponent`, the source-synchronized scoped selector, or installed Pi code.

The component will own only presentation state: query, filter, selected row, current desired scope/order, last-saved scope/order, active model reference, refresh status, and dirty comparison. The shell will provide callbacks for model selection, session-scope updates, persistence, cancellation, and render requests.

A direct merge into `ScopedModelsSelectorComponent` was rejected because that component is source-synchronized pinned behavior needed by the comparison profile. Reusing the v2 extension's `EditorModal` directly was rejected because that package-local abstraction is not part of this repository's runtime boundary.

### 3. Represent explicit scope separately from all-model fallback

The unified dialog will display explicit scope membership. A profile with no `enabledModels` setting is represented in the dialog as an empty explicit scope, while the engine keeps its existing empty-scope fallback that cycles all available models. Space creates or removes explicit membership; order is retained for cycling and can still be changed with existing reorder bindings.

The engine façade will expose enough information to distinguish the persisted explicit setting from the effective session fallback. The shell will initialize the desired scope from the current session state, keep a saved baseline for dirty comparison, update the live session after every scope operation, and replace the saved baseline only after persistence succeeds.

Treating fallback-all as every row explicitly scoped was rejected because it conflicts with the v2 scope markers and makes the first toggle remove one model from an implicit full list rather than create an intentional scope.

### 4. Keep selection and scope persistence as separate transactions

Enter delegates to the bare `models` workflow to perform the authoritative model lookup, bounded refresh fallback, active-session update, default-model persistence, view emission, and existing status/error presentation. Successful selection closes the dialog. It does not save pending scope edits.

Space and advanced scope actions call the existing session-scope authority immediately and keep the dialog open. Ctrl+S persists the desired scope/order through the settings authority. The component clears dirty state only after the save callback resolves successfully; failure leaves both the dialog and `(unsaved)` state intact and is surfaced through the existing workflow/error presentation.

Automatically saving scope on model selection or Escape was rejected because it destroys the current session-only editing contract.

### 5. Use one refresh lifecycle and preserve local edits across refresh

Opening `/models` renders cached authenticated models immediately and starts the existing bounded catalog refresh. Refresh completion replaces only catalog metadata. Query, filter, selection where the model still exists, desired scope/order, and dirty state remain local. Refresh failure or timeout updates the dialog's bounded status and retains cached authoritative rows; it never introduces unauthenticated providers.

If `/models` has an argument, it seeds the query. Exact model switching still occurs only by explicit Enter in the dialog. This follows the requested unified workflow and avoids the old split where a command argument could execute before scope state was visible.

### 6. Make requested row and title geometry explicit

Rows render in this order: selection arrow, scope marker, model identifier, `[provider]`, then the active-model `✓`. The title renders `Models` followed immediately by warning-styled ` (unsaved)` only when desired scope/order differs from the saved baseline. The status is not repeated in the footer. The compact footer follows the v2 primary interactions; advanced scope operations remain reachable through effective bindings and discoverable through shortcut help.

All rows will be truncated by display width through the TUI utilities, and focus will propagate to the search input for IME positioning.

## Risks / Trade-offs

- **[Risk] Product-mode route splitting touches command typing, autocomplete, and modal inventory.** → Keep a shared route union but derive advertised/accepted routes by product mode; add focused assertions for both bare and comparison catalogs.
- **[Risk] Empty explicit scope and all-model fallback can be conflated by current nullable APIs.** → Add a typed context that carries persisted explicit IDs and effective session IDs separately, and test empty, partial, full, and unavailable configured values.
- **[Risk] Async refresh or save can overwrite newer local edits.** → Apply refresh only to catalog metadata, capture component lifetime, and clear dirty state only for the exact scope snapshot whose persistence succeeded.
- **[Risk] Removed bare commands affect tests, docs, fixtures, and extension-name collision handling.** → Search all route inventories and update only bare-A1 expectations; retain pinned fixtures and comparison assertions.
- **[Trade-off] Advanced scope actions are less prominent than in the pinned scoped dialog.** → Preserve their effective bindings and shortcut discoverability while keeping the requested v2 compact footer and primary interaction model.

## Migration Plan

1. Introduce the unified component and typed adapter/shell context without changing the comparison component paths.
2. Add the bare `models` route, route autocomplete and explicit model-selection actions to it, then remove `model` and `scoped-models` from the bare catalog.
3. Update focused tests, modal inventory, snapshots/fixtures, README/help text, and provenance declarations for the bare replacement while retaining comparison coverage.
4. Roll back by reverting the change; no settings migration is required because `defaultProvider`, `defaultModel`, and `enabledModels` retain their existing formats.
