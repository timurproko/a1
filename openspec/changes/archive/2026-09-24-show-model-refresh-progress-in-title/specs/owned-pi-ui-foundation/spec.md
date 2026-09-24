## MODIFIED Requirements

### Requirement: Bare A1 unifies model selection and scope management
Bare A1 SHALL expose one `/models` command for selecting the active model and managing the model scope used by cycling. Bare A1 SHALL NOT advertise or execute `/model` or `/scoped-models` as compatibility aliases. The pinned `a1 pi` comparison profile SHALL retain its existing `/model` and `/scoped-models` routes and presentations.

The Models dialog SHALL use the available authenticated model catalog and SHALL present an `all` filter and a `scoped` filter, searchable model rows ordered by provider and model identifier, the selected model's display name, and the effective model-scope state. Each row SHALL render its scope marker before the model identifier and its provider as `[provider]`. The active-model checkmark SHALL render immediately after `[provider]`, not before the provider or in another column.

Space SHALL toggle the selected model's membership in the session's cycling scope without closing the dialog. Tab SHALL switch the filter while preserving the applicable query and selection. Enter SHALL select the highlighted model, persist it as the default through the existing model-selection policy, and close the dialog on success. Existing bulk-enable, clear, provider-toggle, and scope-order actions SHALL remain reachable through their effective model-scope bindings. Escape SHALL close silently while retaining session-only scope changes and SHALL NOT persist those changes implicitly.

The dialog SHALL compare its current scope and order with the last successfully saved scope. Whenever they differ, the title row SHALL read `Models (unsaved)`, with `(unsaved)` immediately after the title. Ctrl+S SHALL persist the current scope and order while leaving the dialog open; only a successful save SHALL clear `(unsaved)`. An empty explicit scope SHALL preserve the existing all-model cycling fallback.

While a real catalog refresh runs in the background, the dialog SHALL show a muted `(refreshing)` marker on the title row, SHALL NOT render the full progress sentence in its body, and SHALL keep `(refreshing)` visible for at least one second so fast completion cannot reduce it to an unreadable flash. After both the refresh outcome and minimum-visible interval are satisfied, success SHALL replace `(refreshing)` with a success-colored `(refreshed)` marker on the title row and SHALL remove `(refreshed)` automatically after two seconds. Refresh markers SHALL coexist with `(unsaved)` without hiding or clearing the dirty state. Timeout and failure outcomes SHALL remove the title refresh marker after the minimum-visible interval and remain visible as actionable warning details in the body.

#### Scenario: Advertise the unified bare-A1 command
- **WHEN** bare A1 builds its slash-command catalog
- **THEN** `/models` SHALL be advertised as the model selection and scope-management command
- **AND** `/model` and `/scoped-models` SHALL not be advertised or accepted
- **AND** `a1 pi` SHALL retain its pinned command catalog unchanged

#### Scenario: Open the Models dialog
- **WHEN** the user invokes `/models` with available authenticated models
- **THEN** one dialog titled `Models` SHALL open with `all` and `scoped` filters, a search input, model rows, the selected model's display name, and model-management instructions
- **AND** an argument supplied to `/models` SHALL seed the search query rather than selecting an inexact model silently

#### Scenario: Render scope and active-model state
- **WHEN** a model row is rendered
- **THEN** its filled or empty scope marker SHALL precede the model identifier
- **AND** its active-model checkmark, when present, SHALL appear immediately after its `[provider]` badge

#### Scenario: Toggle scope without saving
- **WHEN** the user presses Space on a model whose scope membership changes
- **THEN** the dialog SHALL remain open and update the session's cycling scope immediately
- **AND** the title SHALL become `Models (unsaved)`
- **AND** switching between `all` and `scoped` SHALL reflect the pending scope state

#### Scenario: Save scope changes
- **WHEN** the user presses Ctrl+S after changing scope membership or order and persistence succeeds
- **THEN** the scope SHALL be saved, the dialog SHALL remain open, and `(unsaved)` SHALL disappear from the title
- **AND** a save failure SHALL leave `(unsaved)` visible and report the failure without closing the dialog

#### Scenario: Select the active model
- **WHEN** the user presses Enter on an available model
- **THEN** the active model and persisted default SHALL change through the existing model-selection policy
- **AND** the dialog SHALL close and the existing model confirmation SHALL be presented
- **AND** pending unsaved scope changes SHALL remain session-only rather than being saved as a side effect

#### Scenario: Cancel with pending scope changes
- **WHEN** the user presses Escape while the title shows `(unsaved)`
- **THEN** the dialog SHALL close silently and restore the ordinary input surface
- **AND** the changed scope SHALL remain effective for the current session but SHALL not be written to settings

#### Scenario: Refresh model catalogs
- **WHEN** the Models dialog starts its real background catalog refresh
- **THEN** the title SHALL show muted `(refreshing)`, including alongside `(unsaved)` when the scope is dirty
- **AND** the full progress sentence SHALL not appear in the dialog body
- **AND** quick completion SHALL leave `(refreshing)` visible until one second has elapsed from refresh start
- **WHEN** catalog refresh then succeeds and the minimum-visible interval has elapsed
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state while updating the available rows
- **AND** the title SHALL replace `(refreshing)` with success-colored `(refreshed)`
- **AND** `(refreshed)` SHALL remain visible for two seconds and then disappear automatically while the dialog remains open

#### Scenario: Model catalog refresh fails or times out
- **WHEN** catalog refresh fails or times out while the Models dialog is open
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state without broadening availability to unauthenticated providers
- **AND** after the one-second minimum-visible interval it SHALL remove `(refreshing)` and report the bounded warning details in the dialog body without showing `(refreshed)`

#### Scenario: Invoke an explicit model-selection binding
- **WHEN** the user invokes an explicitly configured model-selection shortcut in bare A1
- **THEN** the same unified Models dialog SHALL open
- **AND** scope management and model selection SHALL have the same behavior as invocation through `/models`
