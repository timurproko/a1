## 1. Stabilize pending value presentation

- [x] 1.1 Distinguish an app-pending scalar from an authoritative stored/effective entry when rendering a Settings row; show only the normally formatted pending value and retain refreshed deferred/failure presentation after completion.
- [x] 1.2 Add a delayed-change regression that inspects the intermediate frame and proves no stale `(effective …)` or application-boundary text flashes before a successful live value settles.

## 2. Add reversible Settings edits

- [x] 2.1 Add screen-local, user-action-ordered undo records for successful scalar and structured changes, capturing exact prior values without changing manager or storage ownership.
- [x] 2.2 Restore the newest record through its original backend, avoid recording the restoration as redo/history, discard failed forward attempts, and retain a failed restoration for retry with the authoritative value and failure notice intact.
- [x] 2.3 Declare and decode `Ctrl+Z` for the Settings list and structured-dialog scopes, route the same action from an open value menu and active search, and derive concise `Ctrl+Z undo` footer/listing guidance from those declarations.
- [x] 2.4 Add focused regressions for A1 and agent scalar routing, reverse-order repeated undo, value-menu/search dispatch, whole-object structured restoration, failed forward changes, failed undo retry, and history reset on a new screen.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused Settings and shortcut-governance tests plus typechecking permitted by repository policy; record exact results and any explicit gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and hand off a color-preserving `/settings` check covering stable value changes, repeated `Ctrl+Z`, scalar menus, structured settings, search, and visible shortcut guidance.

## 4. Match structured dialogs to their pinned workflows

- [x] 4.1 Let the structured panel's standard top rule replace the ordinary Settings footer divider while preserving content height and keyboard geometry.
- [x] 4.2 Present `modelThinkingLevels` as a shared two-step dialog with the stable A1 title, muted inline step marker, next-line step descriptions, model-search input, descriptor-derived models and levels, whole-object writes, loop/back behavior, and step-specific shortcut footer.
- [x] 4.3 Consume every pointer report while a structured dialog is open without moving selection, changing values, advancing steps, or acting on the Settings surface behind it.
- [x] 4.4 Remove Pi wheel-distance ownership and presentation from bare A1's custom viewport while retaining comparison behavior; label the unchanged `fullscreenCopyOnSelect` backend as `Copy on select` only in bare Settings.
- [x] 4.5 Add focused coverage for the sole upper rule, exact frame size and bottom rule, generic title/description/menu order, Enter-only changing, per-model title/ASCII search prompt/filter/steps/writes/back behavior, one-space selection cursors, muted provider suffixes, concise active hints, keyboard-only pointer suppression, hidden bare wheel control, concise copy label, scalar-menu value alignment, and comparison isolation.
- [x] 4.6 Rebuild and hand off the refined Settings dialogs and Agent section for confirmation that the duplicate bar is gone, per-model thinking matches the requested workflow, and viewport controls are concise and nonredundant.
- [x] 4.7 Centralize owned-dialog shortcut grammar and styling enforcement so shared declaration/renderer tests reject inconsistent future keyed hints without adding per-dialog consistency tests.
