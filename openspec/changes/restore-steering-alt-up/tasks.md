## 1. Restore declaration-driven dispatch

- [x] 1.1 Override `app.message.dequeue` only in the bare-A1 input profile and verify the owned manager resolves `Alt+Up` on the current platform while the pinned manager retains its upstream platform default.
- [x] 1.2 Add owned-editor input coverage that sends `Alt+Up` through normal dispatch and verify it invokes dequeue exactly once without inserting text or claiming unrelated modal bindings.
- [x] 1.3 Cover an explicit `app.message.dequeue` override and verify the configured key replaces the default through existing resolution without rewriting the user's file.

## 2. Align every visible hint

- [x] 2.1 Derive the expanded bare-A1 startup-help dequeue label from effective keybindings and verify default and overridden labels match dispatch while pinned help remains unchanged.
- [x] 2.2 Supply effective bindings lazily to the custom queued-input presenter and verify pending steering/follow-up rows show the current dequeue key after default construction and override/reload changes.
- [x] 2.3 Extend shortcut-list regression coverage and verify startup help, `/hotkeys`, and the pending-queue hint all name the same active restore key.

## 3. Validate queue behavior and handoff

- [x] 3.1 Exercise queued steering and follow-up restoration through the keyboard action and verify queue clearing, message order, editor text, pending-row removal, and compaction behavior remain intact.
- [x] 3.2 Run focused component, session-shell, keybinding, type, and strict OpenSpec validation and retain implementation evidence with any known gaps explicitly dispositioned.
- [x] 3.3 Build the exact candidate and prepare its interactive Windows handoff; verify the focused keyboard regression returns pending steering messages to the editor without using `Alt+Q`.
