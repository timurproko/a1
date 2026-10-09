## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Second of eight preparatory changes for multi-agent tabs; start after `multi-agent-prep-hygiene` merges and reconcile `origin/develop` first. The `extract-pi-session-presenters` change depends on this one.

## 1. Contract

- [ ] 1.1 Add `src/contracts/owned-ui/session-backend.ts` declaring `OwnedUiSessionBackend` and the identity, session, workflows, settings, catalog, extensions, and transitional pinned sub-ports with exactly the members listed in `design.md`.
- [ ] 1.2 Move the plain request, result, snapshot, option, and context types from `src/integrations/pi/engine/workflows.ts` into `src/contracts/owned-ui` under `OwnedUi*` names; leave one-cycle aliases in `workflows.ts`.
- [ ] 1.3 Export the new names from `src/contracts/owned-ui/index.ts` without `export *`.

## 2. Adapter

- [ ] 2.1 Declare `PiEngineAdapter implements OwnedUiSessionBackend`; expose each sub-port as a getter over `#engine`, `#workflows`, `#settings`, `#contexts`, `#resources`, and `#extensions`.
- [ ] 2.2 Remove `setDefaultThinkingLevel` and `applyPinnedSettingValue` from the public surface; make `#perform` cover their behavior under `set-thinking-level` and `set-setting`.
- [ ] 2.3 Add a contract test in `test/integrations/pi/engine` that assigns an adapter instance to `OwnedUiSessionBackend`.

## 3. Shell and composition

- [ ] 3.1 Replace `OwnedUiBackendPort` in `session-shell-root.ts:146` with the interface; update every `backend.*` call site in `session-shell.ts` and `session-shell-root.ts` to the sub-port form.
- [ ] 3.2 Replace the two imperative settings calls at `session-shell.ts:1062` and `session-shell.ts:1363` with `execute` commands.
- [ ] 3.3 Update `src/composition/owned-ui.ts` and `src/composition/session-info-reference.ts` to depend on the interface; change `createPiAdapter` to return the interface.

## 4. Validation evidence

- [ ] 4.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `test/contracts/owned-ui` owners.
- [ ] 4.2 Record in the acceptance list the final member count per sub-port and confirm no `unknown`-typed member exists outside the transitional pinned port.
