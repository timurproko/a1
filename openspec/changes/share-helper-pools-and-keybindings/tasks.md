## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Fifth of eight preparatory changes for multi-agent tabs; start after `session-shell-lifecycle-ordering` merges and reconcile `origin/develop` first.

## 1. Clipboard services

- [ ] 1.1 Add `OwnedUiClipboardServices` in `src/app/session-shell` with `paste`, `copy`, `images`, `warm()`, and `dispose()`; construct it in `src/composition/owned-ui.ts` and pass it to the shell as `clipboard`.
- [ ] 1.2 Remove pool creation from `PastePreparationClient`, `PromptChipStore`, and `createResponseCopyExecutor` call sites in the shell and root; remove the warm calls at `session-shell.ts:746-747`.
- [ ] 1.3 Move `ACTIVE_IMAGE_WORKERS`, the paste `live` set and `conversionQueue`, and the clipboard write serialization onto the respective client instances.
- [ ] 1.4 Dispose the services object in composition after the shell.

## 2. Keybindings host

- [ ] 2.1 Add `createPiKeybindingsHost()` to `src/integrations/pi/components` and export it from the owner index.
- [ ] 2.2 Remove `setKeybindings(KeybindingsManager.create())` from `ensureTheme()` in `shell-shared-facade.ts:363`; pass the shared manager into `createPiShellEditor` and every presenter that previously relied on the reset.
- [ ] 2.3 Replace per-key `activateKeybindings()` in `session-viewport-controller.ts:303-304` with the host's identity-guarded `ensureActive()`; route `reloadKeybindings()` through the host.
- [ ] 2.4 Create and apply the host in composition before the shell is constructed.

## 3. Validation evidence

- [ ] 3.1 Add a test that two shells sharing one services object fork at most one spare per helper kind, and a test that building footer and info presenters does not change the active keybinding manager.
- [ ] 3.2 Run `npm run typecheck` and the `test/app/session-shell`, `test/integrations/pi/components`, and `test/composition` owners; record helper process counts before and after in the acceptance list.
