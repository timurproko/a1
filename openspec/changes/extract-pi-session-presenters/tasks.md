## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Third of eight preparatory changes for multi-agent tabs; start after `narrow-owned-ui-backend-port` merges and reconcile `origin/develop` first. The `session-tab-host` change depends on this one.

## 1. Owner registration

- [ ] 1.1 Add the `pi-session-presenters` owner to `scripts/governance/project-structure-policy.mjs` and add it to the `mayImport` lists of `session-shell` and `composition`.
- [ ] 1.2 Update the owner-id list in `test/repository-governance/project-structure-policy.test.ts`, add the prefix to `config/validation-ownership.json`, and add the directory to `docs/architecture/project-structure.md`.
- [ ] 1.3 Create `src/integrations/pi/session-presenters/index.ts` and `test/integrations/pi/session-presenters/` so `check:architecture` sees both roots.

## 2. Contract

- [ ] 2.1 Declare `OwnedUiDialogHost`, `OwnedUiSessionPresenters`, and `OwnedUiTranscriptRendererPort` in `src/contracts/owned-ui` and export them from its index.

## 3. Presenters

- [ ] 3.1 Implement `createPiSessionPresenters(adapter)` with `transcriptRenderers`, `openModelSelector`, `openSessionSelector`, and `openTreeSelector`, moving the bodies from `session-shell.ts:1098-1125`, `:1300-1324`, and `:1201-1260`.
- [ ] 3.2 Implement `openModelsDialog` and `openScopedModelsSelector` over one shared refresh-and-timeout helper, moving the bodies from `session-shell.ts:1582-1657` and `:1660-1745`.
- [ ] 3.3 Add tests for each presenter using the fake `AgentSessionRuntime` pattern from `test/app/session-shell/session-shell-fixture.ts`.

## 4. Shell, adapter, composition

- [ ] 4.1 Add a `presenters` option to `OwnedUiSessionShell`; implement `OwnedUiDialogHost` on the shell; replace the five `show*` methods with calls to the presenters.
- [ ] 4.2 Replace the root's renderer callbacks at `session-shell.ts:359-361` with `presenters.transcriptRenderers()`.
- [ ] 4.3 Delete the transitional `pinned` sub-port from `OwnedUiSessionBackend` and the six members from `PiEngineAdapter`'s public surface, keeping them package-private for the presenters.
- [ ] 4.4 Construct the presenters in `src/composition/owned-ui.ts` and pass them to the shell.

## 5. Validation evidence

- [ ] 5.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/session-presenters`, `test/integrations/pi/engine`, `test/composition`, and `test/repository-governance` owners.
- [ ] 5.2 Record in the acceptance list that no member of `OwnedUiSessionBackend` is typed `unknown` and that `src/app` imports no selector factory from `src/integrations/pi/components`.
