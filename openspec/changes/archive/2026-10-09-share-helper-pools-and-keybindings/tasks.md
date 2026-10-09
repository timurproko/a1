## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Fifth of eight preparatory changes for multi-agent tabs; start after `session-shell-lifecycle-ordering` merges and reconcile `origin/develop` first.

## 1. Clipboard services

- [x] 1.1 Add `OwnedUiClipboardServices` (shared paste and copy `HelperPool`s) in `src/app/session-shell/clipboard-services.ts`; construct it in `src/composition/owned-ui.ts` and pass it to the shell as `shared.clipboard`.
- [x] 1.2 Let `PastePreparationClient` and `createResponseCopyExecutor` borrow a pool without disposing it; the shell passes the shared pools through and keeps its idempotent post-first-frame warm calls (see `design.md`).
- [x] 1.3 Dropped: the module-level caps are already process-wide, which is the intended limit (see `design.md`).
- [x] 1.4 Dispose the services object in composition after the shell, including when shell disposal or construction fails.

## 2. Keybindings host

- [x] 2.1 Add `createPiKeybindingsHost()` to `shell-shared-facade.ts` and export it from the component owner index.
- [x] 2.2 Stop `ensureTheme()` from resetting the registry (it installs Pi's defaults only when no A1 manager is active); pass the shared host into `createPiShellEditor`; stop the extension UI bridge writing the registry.
- [x] 2.3 Make the editor's `activateKeybindings()` the host's identity-guarded `ensureActive()`; route `reloadKeybindings()` through `host.reload()`.
- [x] 2.4 Create and apply the host in composition before the shell is constructed.

## 3. Validation evidence

- [x] 3.1 Add a test that two shells sharing one services object fork one spare per helper kind, and a test that building footer, header, and info presenters does not change the active keybinding manager.
- [x] 3.2 Run `npm run typecheck` and the `test/app/session-shell`, `test/integrations/pi/components`, `test/composition`, and `test/features/owned-ui` owners; record helper process counts in the acceptance list.
