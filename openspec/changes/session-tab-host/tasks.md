## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Seventh of eight preparatory changes for multi-agent tabs and the last in the UI sequence; start only after `narrow-owned-ui-backend-port`, `extract-pi-session-presenters`, `session-shell-lifecycle-ordering`, `share-helper-pools-and-keybindings`, and `pi-engine-host` have merged, and reconcile `origin/develop` first.

## 1. Contracts

- [ ] 1.1 Declare `OwnedUiSessionPresenter`, `OwnedUiTerminalHost`, `OwnedUiPresenterHost`, and the frame-epoch field on the frame descriptor in `src/contracts/owned-ui`; make `OwnedUiDialogHost` extend `OwnedUiPresenterHost`.

## 2. Damage-aware terminal

- [ ] 2.1 Add `invalidatePresentation()` and a frame epoch to `src/integrations/pi/tui-runtime/damage-aware-terminal.ts`; compare frame ids only within an epoch; add tests in `test/integrations/pi/tui-runtime`.

## 3. Terminal host

- [ ] 3.1 Add `src/app/session-shell/terminal-host.ts` owning the runtime, damage terminal, pointer reporting (`session-shell.ts:1740-1747`), pre-input listener (`:482-530`), quit outro and dispose (`:1763-1856`), and the active presenter.
- [ ] 3.2 Implement `openRoute` over `UiAppHost` and delete `#openOwnedRoute` (`session-shell.ts:1953-2060`).
- [ ] 3.3 Implement `requestRender(from)` gating and `attach()` invalidation.

## 4. Session presenter

- [ ] 4.1 Rename `OwnedUiSessionShell` to `OwnedUiSessionPresenter`; remove runtime construction (`:369-412`) and every direct runtime call, replacing them with the presenter host handle.
- [ ] 4.2 Give `OwnedUiSessionShellRoot` a presenter id and namespace its scroll-view keys (`session-shell-root.ts:1098`).
- [ ] 4.3 Keep `#customViewport` behavior unchanged; verify reference screens byte-for-byte.

## 5. Composition and tests

- [ ] 5.1 Update `src/composition/owned-ui.ts` to create the host and one presenter and return the same `OwnedUiApplicationPort`.
- [ ] 5.2 Update `test/app/session-shell/session-shell-fixture.ts` to build host plus presenter over the fake terminal; keep all existing assertions.
- [ ] 5.3 Add a host test for second-presenter attach (one full paint) and inactive `requestRender` (no paint).

## 6. Validation evidence

- [ ] 6.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/tui-runtime`, `test/ui/apps`, and `test/composition` owners; record the reference-screen diff result in the acceptance list.
