## 1. Route and engine contracts

- [ ] 1.1 Add product-mode-aware model workflow catalogs so bare A1 advertises and accepts only `models` while the comparison profile retains `model` and `scoped-models`; verify focused workflow-controller and autocomplete tests cover both catalogs and reject the removed bare names.
- [ ] 1.2 Add a typed unified-model context that separates available authenticated models, active model, current explicit session scope/order, and persisted scope/order; verify adapter tests cover empty fallback-all, partial, full, unavailable, and ordered scope settings.
- [ ] 1.3 Route bare `models` selection through authoritative lookup, bounded refresh fallback, active-session change, default-model persistence, view emission, and existing status/error semantics; verify focused engine tests cover success, missing/inexact input, refresh failure/timeout, unavailable providers, persistence, and cancellation.

## 2. Unified Models component

- [ ] 2.1 Implement the A1-owned searchable Models component with `all`/`scoped` filters, provider/model ordering, display-name detail, IME focus propagation, width-safe rows, and v2-style primary hints; verify component tests cover narrow/wide rendering, filtering, search, selection retention, and no-match states.
- [ ] 2.2 Render scope markers before model identifiers, the active `✓` immediately after `[provider]`, and warning-styled `(unsaved)` immediately after `Models`; verify semantic-ANSI snapshots assert exact token order and title placement in clean and dirty states.
- [ ] 2.3 Implement Space scope toggling, Tab filtering, Enter model selection, Escape cancellation, Ctrl+S persistence, and the existing bulk/provider/reorder scope bindings; verify interaction tests prove session-only updates, stable scope order, fallback-all behavior, successful dirty reset, failed-save retention, no implicit save, and silent cancellation.
- [ ] 2.4 Implement bounded asynchronous catalog refresh without overwriting query, surviving selection, pending scope edits, order, or dirty state; verify component/shell tests cover success, error, timeout, unavailable rows, and disposal during refresh.

## 3. Shell integration and presentation

- [ ] 3.1 Add the unified component façade and bare shell controller, route `/models [query]` and explicit model-selection bindings to it, and preserve model confirmation as a transient dock notice; verify focused shell tests cover open, switch, scope/save, failure, cancel, focus restoration, argument seeding, and working-session notice placement.
- [ ] 3.2 Keep the pinned comparison profile on its existing model and scoped-model components and command outcomes; verify comparison fixtures and focused parity cases still open, interact with, and close both original surfaces unchanged.
- [ ] 3.3 Update bare command discovery, help text, modal-transition inventory, and route collision handling to use only `models`; verify command, shortcut-help, modal-inventory, and extension-command collision tests fail if either removed bare command reappears.

## 4. Regression evidence and documentation

- [ ] 4.1 Replace separate bare model/scoped outcome cases and snapshots with unified clean, dirty, saved, switched, refresh, error, timeout, custom-binding, and unbound-help cases while retaining pinned comparison cases; verify the focused command-outcome and platform-label suites pass.
- [ ] 4.2 Update README, feature instructions, source/provenance declarations, and maintained fixtures that describe the bare model command or dialog; verify changed-documentation and architecture/provenance checks report no stale bare `/model` or `/scoped-models` guidance.

## 5. Focused validation and handoff

- [ ] 5.1 Run `npm run typecheck` and focused Vitest suites for workflow controllers, engine workflows, Models components, shell command outcomes, shortcut help, modal inventory, and viewport notices; record passing commands or resolve every failure without invoking the repository's prohibited local full/fast/release suites.
- [ ] 5.2 Run `npm run build`, launch the candidate only through `./scripts/dev`, and prepare the manual handoff for `/models` covering exact checkmark/title placement, filter/search, model switching, scope editing/saving/cancel, removed bare commands, explicit shortcut routing, and unchanged `./scripts/dev pi` comparison behavior.
