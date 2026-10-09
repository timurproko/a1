## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Third of eight preparatory changes for multi-agent tabs; start after `narrow-owned-ui-backend-port` merges and reconcile `origin/develop` first. The `session-tab-host` change depends on this one.

## 1. Owner registration

- [x] 1.1 Add the `pi-session-presenters` owner to `scripts/governance/project-structure-policy.mjs` and add it to the `mayImport` list of `composition`. The shell does not import the owner, so its list is unchanged (see `design.md`).
- [x] 1.2 Update the owner-id list in `test/repository-governance/project-structure-policy.test.ts`, add the prefix to `config/validation-ownership.json`, and add the directory to `docs/architecture/project-structure.md`.
- [x] 1.3 Create `src/integrations/pi/session-presenters/index.ts` and `test/integrations/pi/session-presenters/` so `check:architecture` sees both roots.

## 2. Contract

- [x] 2.1 Declare `OwnedUiDialogHost`, `OwnedUiSessionPresenters`, and `OwnedUiTranscriptRendererPort` in `src/contracts/owned-ui` and export them from its index.

## 3. Presenters

- [x] 3.1 Implement `createPiSessionPresenters(adapter)` with `transcriptRenderers`, `openModelSelector`, `openSessionSelector`, and `openTreeSelector`, moving the bodies from `session-shell.ts:1098-1125`, `:1300-1324`, and `:1201-1260`. `openSettingsSelector` moves too, so the last transitional members can leave the backend.
- [x] 3.2 Implement `openModelsDialog` and `openScopedModelsSelector` over one shared refresh-and-timeout helper, moving the bodies from `session-shell.ts:1582-1657` and `:1660-1745`.
- [x] 3.3 Add tests for each presenter using the fake `AgentSessionRuntime` pattern from `test/app/session-shell/session-shell-fixture.ts`.

## 4. Shell, adapter, composition

- [x] 4.1 Add a `presenters` option to `OwnedUiSessionShell`; implement `OwnedUiDialogHost` on the shell; replace the five `show*` methods with calls to the presenters.
- [x] 4.2 Replace the root's renderer callbacks at `session-shell.ts:359-361` with `presenters.transcriptRenderers()`.
- [x] 4.3 Delete the transitional `pinned` sub-port from `OwnedUiSessionBackend` and its members from `PiEngineAdapter`'s public surface. They stay reachable for the presenters through `presentationSource()`, and `bindExtensionUi` returns to `extensions` typed with `OwnedUiExtensionUiPort`.
- [x] 4.4 Construct the presenters in `src/composition/owned-ui.ts` and pass them to the shell.

## 5. Validation evidence

- [x] 5.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/session-presenters`, `test/integrations/pi/engine`, `test/composition`, and `test/repository-governance` owners.
- [x] 5.2 Record in the acceptance list that no member of `OwnedUiSessionBackend` is typed `unknown` and that `src/app` imports no selector factory from `src/integrations/pi/components`.

## Acceptance evidence

- `OwnedUiSessionBackend` has no `pinned` sub-port. Its members, pinned by `test/integrations/pi/engine/session-backend.test.ts`: identity 7, session 7, workflows 8, settings 5, catalog 15, extensions 8 (with `bindExtensionUi`), for 50. The same test fails at type level if any backend member's value, parameter, or awaited result is `unknown` or `any`, and it checks that its own detector flags such a member.
- `src/app` imports no model, session, settings, models-dialog, or scoped-models selector factory from `src/integrations/pi/components`, and no `PiSessionPresentationSource`; `inspectLayerBoundaries` now rejects the latter, with a policy test. The shell still builds the selectors whose inputs are plain contract payloads (fork, login, logout, trust, skills, thinking), which this change leaves in place.
- `npm run typecheck` (including `tsconfig.bin.json` after `npm run build`), `npm run check:architecture`, `npm run check:code-documentation`, and `npm run check:names` pass.
- One unsharded local run of `test/app/session-shell`, `test/integrations/pi` (including the new `session-presenters` owner), `test/composition`, `test/repository-governance`, `test/features/owned-ui`, and `test/contracts` covered 309 files: 3,545 tests passed, 1 was skipped, and 11 failed. Ten failures were 5 s timeouts under that load (`clipboard-packaged`, `naming-selection`, `terminal-architecture-policy`, `validation-impact`); those four files pass when run together (69 tests). The eleventh is `local-cleanup.node.mjs` "complete blocks unknown ignored content and conflicting ownership", which fails during fixture setup (`worktree-inventory`) in this worktree. It passes when run alone here and passes in a fresh `origin/develop` worktree at `7bcba682`, and this change touches no cleanup code.
- Design gaps found during implementation:
  - The transitional port held nine members, not six; the settings selector and `bindExtensionUi` also had to leave it. See `design.md`.
  - The component bridge now publishes its context as `OwnedUiExtensionUiPort`, after the runtime assertion the engine already applied at bind time. The one bridge test that drives Pi's four-argument `custom` factory names the Pi type itself.
  - The dialog host's optional members depend on the session layout, so the shell builds it after the layout is known. The shell's tree hold test caught an earlier ordering that gave bare A1 the comparison host.
  - Twelve test sites and one worker that construct the shell now pass `createPiSessionPresenters(adapter)`, and engine tests read selector contexts through `presentationSource()`.
- The startup graph grows from 156 files / 1,597,595 bytes to 158 files / 1,602,252 bytes: the presenters owner's `index.ts` and `presenters.ts`, net of the bodies removed from the shell. `config/startup-graph-baseline.json` is regenerated with `scripts/pi/update-startup-graph-baseline.mjs`.
