## 1. Stabilize pending value presentation

- [x] 1.1 Distinguish an app-pending scalar from an authoritative stored/effective entry when rendering a Settings row; show only the normally formatted pending value and retain refreshed deferred/failure presentation after completion.
- [x] 1.2 Add a delayed-change regression that inspects the intermediate frame and proves no stale `(effective …)` or application-boundary text flashes before a successful live value settles.

## 2. Add reversible Settings edits

- [x] 2.1 Add screen-local, user-action-ordered undo records for successful scalar and structured changes, capturing exact prior values without changing manager or storage ownership.
- [x] 2.2 Restore the newest record through its original backend, avoid recording the restoration as redo/history, discard failed forward attempts, and retain a failed restoration for retry with the authoritative value and failure notice intact.
- [x] 2.3 Declare and decode `Ctrl+Z` for the Settings list and structured-dialog scopes, route the same action from an open value menu and active search, and derive `Ctrl+Z to undo` footer/listing guidance from those declarations.
- [x] 2.4 Add focused regressions for A1 and agent scalar routing, reverse-order repeated undo, value-menu/search dispatch, whole-object structured restoration, failed forward changes, failed undo retry, and history reset on a new screen.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused Settings and shortcut-governance tests plus typechecking permitted by repository policy; record exact results and any explicit gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and hand off a color-preserving `/settings` check covering stable value changes, repeated `Ctrl+Z`, scalar menus, structured settings, search, and visible shortcut guidance.
