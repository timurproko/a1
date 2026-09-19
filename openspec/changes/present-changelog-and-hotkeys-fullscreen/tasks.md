## 1. Build the reference screen app

- [ ] 1.1 Add `ReferenceScreenApp` in `src/features/owned-ui/reference-screen-app.ts` (title row, blank row, cached width-keyed provider rows, loading notice, ANSI-aware truncation, `ShortcutRegistry` hint line with the interrupt notice, `Esc` close, no interrupt consumption); verify app tests cover a fitting document, a pending provider becoming ready, truncation of an over-wide styled row, re-rendering only on width change, and the frame contract at small rectangles.
- [ ] 1.2 Add rail and scrolling through the shared scrollbar components honoring `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` (row, page, `Home`/`End`, wheel distance, hover, thumb drag, track paging, linger, hidden appearance returning the columns); verify tests cover clamping at both ends, every speed, hover/drag/track mapping, the linger window with an injected clock, and resize clamping.

## 2. Extend the route seam and host

- [ ] 2.1 Add the optional `UiRouteInput` document parameter to `UiRouteHost.open` in `src/ui/apps/contracts.ts` and its Pi integration re-export; verify the settings route ignores it and existing route-host tests compile and pass unchanged.
- [ ] 2.2 Extend `createOwnedRouteHost` to claim `changelog` and `hotkeys`, opening `ReferenceScreenApp` through the deferred-surface helper in a `UiAppHost` with `closeOnInterrupt: true` and the pinned theme, using composition-supplied providers; verify route-host tests cover claims, deferred load with a supplied document versus none, render/input/mouse forwarding, close and exit propagation, and a provider failure surfacing as a loading failure rather than a crash.
- [ ] 2.3 Add `renderPiShellChangelogLines` and `renderPiShellHotkeysLines` beside the feed presenters in `shell-presenters-info.ts` and wire the providers in `src/composition/owned-ui.ts` (`readPinnedCommandChangelog()` or the supplied document; the shell's current keybinding configuration and extension shortcuts at open time); verify component tests prove each screen row equals the former in-feed document row without its chrome at 80 and 120 columns, and that the comparison composition creates no reference routes.

## 3. Route the commands and startup notes in bare A1

- [ ] 3.1 Let the route host claim `/changelog` and `/hotkeys` in `#slashCommand` ahead of the workflow table and pass the route input through `#openOwnedRoute`; verify shell tests for the custom viewport show the screen open, the editor cleared, no feed rows, pointer reporting toggled, `Esc` restoring the viewport, and the pinned layout still appending the in-feed documents.
- [ ] 3.2 Render both changelog diagnostics as the two-line hint in the custom viewport and open the `changelog` route once with the expanded diagnostic's document when no modal is presented; verify shell tests cover expanded and collapsed launches, the once-only guard across repeated views, a presented modal suppressing the screen without a later open, the pinned layout unchanged, and the engine's version bookkeeping untouched.

## 4. Declare and validate

- [ ] 4.1 Move `command:changelog` and `command:hotkeys` to `diverged` with this change as the approved deviation and update `document.changelog-hotkeys` in the presenter-ownership inventory; verify the feature-adoption, presenter-ownership, modal-inventory, module-graph, and architecture governance checks pass with the screens classified as expected.
- [ ] 4.2 Update the command reference documentation for `/changelog`, `/hotkeys`, and the startup notes; verify documentation governance checks pass.
- [ ] 4.3 Obtain required CI results for the implementation candidate and hand off the built candidate with `./scripts/dev` for a manual check of `/changelog`, `/hotkeys`, wheel and rail scrolling, `Esc`, the startup `What's New` screen after resetting the stored version, and `a1 pi` unchanged; verify the recorded manual result before requesting acceptance.
