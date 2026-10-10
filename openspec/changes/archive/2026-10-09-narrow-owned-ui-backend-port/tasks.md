## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Second of eight preparatory changes for multi-agent tabs; start after `multi-agent-prep-hygiene` merges and reconcile `origin/develop` first. The `extract-pi-session-presenters` change depends on this one.

## 1. Contract

- [x] 1.1 Add `src/contracts/owned-ui/session-backend.ts` declaring `OwnedUiSessionBackend` and the identity, session, workflows, settings, catalog, extensions, and transitional pinned sub-ports with exactly the members listed in `design.md`.
- [x] 1.2 Move the plain request, result, snapshot, option, and context types from `src/integrations/pi/engine/workflows.ts` into `src/contracts/owned-ui` under `OwnedUi*` names; leave one-cycle aliases in `workflows.ts`.
- [x] 1.3 Export the new names from `src/contracts/owned-ui/index.ts` without `export *`.

## 2. Adapter

- [x] 2.1 Declare `PiEngineAdapter implements OwnedUiSessionBackend`; expose each sub-port as a getter over `#engine`, `#workflows`, `#settings`, `#contexts`, `#resources`, and `#extensions`.
- [x] 2.2 ~~Remove `setDefaultThinkingLevel` and `applyPinnedSettingValue` from the public surface; make `#perform` cover their behavior under `set-thinking-level` and `set-setting`.~~ Superseded by the design decision "Settings writes stay off the command protocol": `setDefaultThinkingLevel` is a typed settings sub-port member, and `applyPinnedSettingValue` is a pinned sub-port member.
- [x] 2.3 Add a contract test in `test/integrations/pi/engine` that assigns an adapter instance to `OwnedUiSessionBackend`.

## 3. Shell and composition

- [x] 3.1 Replace `OwnedUiBackendPort` in `session-shell-root.ts:146` with the interface; update every `backend.*` call site in `session-shell.ts` and `session-shell-root.ts` to the sub-port form.
- [x] 3.2 ~~Replace the two imperative settings calls at `session-shell.ts:1062` and `session-shell.ts:1363` with `execute` commands.~~ Superseded as in 2.2: the shell calls `backend.settings.setDefaultThinkingLevel` and the narrowed `pinned.applyPinnedSettingValue`.
- [x] 3.3 Update `src/composition/owned-ui.ts` and `src/composition/session-info-reference.ts` to depend on the interface; change `createPiAdapter` to return the interface.

## 4. Validation evidence

- [x] 4.1 Run `npm run typecheck`, `npm run check:architecture`, and the `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `test/contracts/owned-ui` owners.
- [x] 4.2 Record in the acceptance list the final member count per sub-port and confirm no `unknown`-typed member exists outside the transitional pinned port.
- [x] 4.3 Add the `src/app` → `PiEngineAdapter` rule the spec scenario requires to `inspectLayerBoundaries`, with a policy test.

## Acceptance evidence

- Member count per sub-port, pinned by `test/integrations/pi/engine/session-backend.test.ts`: identity 7, session 7, workflows 8, settings 5, catalog 15, extensions 7, for 49 neutral members; transitional pinned 9.
- No member outside `pinned` has an `unknown` parameter or result, and the payload types this change moved into `session-workflows.ts` contain no `unknown`. The pre-existing `OwnedUiCommand`, transcript, dialog, and overlay types that `session` carries keep their JSON-validated `unknown` payload fields unchanged. The settings snapshot's `currentModel` and `availableDefaultModels` moved to `pinned.pinnedSettingsModels()`, and `bindExtensionUi` moved to `pinned` because its argument is a pinned `ExtensionUIContext`.
- `npm run typecheck` (including `tsconfig.bin.json` after `npm ci` built `dist`), `npm run check:architecture`, `npm run check:code-documentation`, and `npm run check:names` pass.
- The `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `test/contracts/owned-ui` owners and `test/repository-governance/project-structure-policy.test.ts` pass apart from two load-sensitive cases: in one unsharded local run of all 92 files on `origin/develop` at `4d5bcbfd`, 1,292 of 1,295 tests passed and 1 was skipped. The two failures were `clipboard-packaged.test.ts` (5 s timeout) and `compaction-progress.integration.test.ts` (`EBUSY` removing its temp directory on Windows); both files pass when run alone (9 tests).
- Design gaps found during implementation:
  - The settings fold would have changed `OwnedUiCommand` semantics and gated global settings writes on per-session admission. Tasks 2.2 and 3.2 are superseded; see `design.md`.
  - `PiSettingKey`, the resource and extension summaries, `OwnedPiVisualExtensionSupport`, and `AdapterCommandResult` also became one-cycle aliases of contract types, because the port's payloads reference them.
  - `armExitNotice` took the flat adapter. `ExitNoticeSource` now reads `identity` and `session` sub-ports.
  - Shell tests that stubbed flat adapter methods now stub the sub-port member the shell calls. The composition tests' fake backends use the sub-port shape.
- The startup graph grows from 155 files / 1,573,425 bytes to 156 files / 1,591,208 bytes: the new runtime contract module `session-workflows.ts` (it holds the command-name constants) and the adapter's sub-port wiring. `config/startup-graph-baseline.json` is regenerated with `scripts/pi/update-startup-graph-baseline.mjs`.
- Class-only member left in composition: `settingsPort()`, because it returns the agent-engine `AgentSettingsPort` and the owned-UI contract may not import agent-engine contracts. Composition reaches it through `ComposedSessionBackend`.
