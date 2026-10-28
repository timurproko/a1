# Tasks

## 1. Tab-bar provider and activation

- [x] 1.1 Add one I/O-free tab-kind provider for Agent, Settings, and Changelog with stable metadata and policies for multiplicity, activation, prewarming, renameability, session ownership, route, and launcher marker.
- [x] 1.2 Route shortcuts, the command palette, plus launcher, popup actions, visibility state, and singleton toggles through one kind activation recipient, removing Agent-versus-utility dispatch and per-kind prewarm fields.
- [x] 1.3 Make server kind recognition, singleton reservation, registry validation, rename admission, Agent-session handling, and bridge-route delivery consume the shared provider instead of duplicate tables and utility-id checks.

## 2. Kind-neutral placement

- [x] 2.1 Add shared live-tab append and reveal-last operations that ignore stopped records and contain no tab-kind conditions; use them for cold holder creation, standby promotion, and hidden singleton reveal.
- [x] 2.2 Preserve selection and dragged order for already shown tabs while newly created or newly shown tabs join at the end, including Agent → Settings → Agent and cold-versus-standby creation regressions.
- [x] 2.3 Update the resident-tab architecture record and focused native coverage for provider registration, activation policies, menus, prewarming, session ownership, routes, renameability, and ordering.

## 3. Prompt selection replacement

- [x] 3.1 Stop editor-owned prompt word and line selection from submitting automatic copy work while retaining the selected range, complete-frame copy-on-select, and explicit editor copy and cut behavior.
- [x] 3.2 Add a shell-level regression that starts with external clipboard text, selects a prompt word through pointer input, and proves `Ctrl+V` replaces the selected word without an intervening clipboard write.
- [x] 3.3 Cover explicit `Ctrl+C` after editor-owned prompt selection and complete-frame automatic copy, update the selection specification, and record the focused implementation evidence.
