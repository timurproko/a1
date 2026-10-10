## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Seventh of eight preparatory changes for multi-agent tabs and the last in the UI sequence; start only after `narrow-owned-ui-backend-port`, `extract-pi-session-presenters`, `session-shell-lifecycle-ordering`, `share-helper-pools-and-keybindings`, and `pi-engine-host` have merged, and reconcile `origin/develop` first.

## 1. Contracts

- [x] 1.1 Declare `OwnedUiSessionPresenter`, `OwnedUiTerminalHost`, `OwnedUiPresenterHost`, and the frame-epoch field on the frame descriptor in `src/contracts/owned-ui`; make `OwnedUiDialogHost` extend `OwnedUiPresenterHost`.

## 2. Damage-aware terminal

- [x] 2.1 Add `invalidatePresentation()` and a frame epoch to `src/integrations/pi/tui-runtime/damage-aware-terminal.ts`; compare frame ids only within an epoch; add tests in `test/integrations/pi/tui-runtime`.

## 3. Terminal host

- [x] 3.1 Add `src/app/session-shell/shell-host.ts` (renamed from `terminal-host.ts`; see design) owning the runtime, damage terminal, pointer reporting (`session-shell.ts:1740-1747`), pre-input listener (`:482-530`), quit outro and dispose (`:1763-1856`), and the active presenter.
- [x] 3.2 Move the route runtime plumbing into the host's `openRoute` and reduce `#openOwnedRoute` to opening the surface; routes already arrive wrapped in `UiAppHost` (see design).
- [x] 3.3 Implement `requestRender(from)` gating and `attach()` invalidation.

## 4. Session presenter

- [x] 4.1 Rename `OwnedUiSessionShell` to `OwnedUiSessionPresenter` (kept in `session-shell.ts`, with `OwnedUiSessionShell` as the single-session host-plus-presenter pairing); remove runtime construction (`:369-412`) and every direct runtime call, replacing them with the presenter host handle.
- [x] 4.2 Replace `layoutRoot()` with `layoutParts()` plus a host-mounted `pinnedLayoutRoot()`, so one runtime holds one `transcript` scroll view regardless of presenter count (supersedes per-presenter key namespacing; see design).
- [x] 4.3 Keep `#customViewport` behavior unchanged; verify reference screens byte-for-byte.

## 5. Composition and tests

- [x] 5.1 Update `src/composition/owned-ui.ts` to create the host and one presenter and return the same `OwnedUiApplicationPort`.
- [x] 5.2 Keep `test/app/session-shell/session-shell-fixture.ts` on `OwnedUiSessionShell`, which is now a host plus presenter over the fake terminal, and add `secondPresenter()` for a detached presenter on the same host; all existing assertions kept.
- [x] 5.3 Add a host test for second-presenter attach (one full paint) and inactive `requestRender` (no paint).

## 6. Validation evidence

- [x] 6.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/tui-runtime`, `test/ui/apps`, and `test/composition` owners; record the reference-screen diff result in the acceptance list.
