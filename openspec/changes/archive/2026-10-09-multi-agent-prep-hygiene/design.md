## Context

This is the first of eight preparatory changes before the multi-agent tabs feature. It lands first so that later refactors of the session shell, the engine adapter, and composition produce diffs that contain only intentional edits. The measurements below were taken on `develop` at `337ad3e7`.

- `src/app/session-shell/session-shell.ts` imports roughly twenty-five names it never uses, several only because `session-shell-root.ts` once lived in the same file.
- `src/integrations/pi/components/upstream/theme/system-theme.ts` (915 lines) has no importer in `src/` or `test/`.
- Of the thirty-five exports in `src/contracts/agent-engine/index.ts`, these have consumers outside `src/contracts`: `AgentSettingOwner`, `AgentSettingsPort`, `AgentSettingDescriptor`, `AgentSettingChangeOutcome`, `AgentPackagesPort`, `agentPackageOutcome`, `AgentMessage`, `AgentEvent`, plus the domain value types that `settings-bridge.ts` imports (`AgentJsonValue`, `AgentSettingApplicationBoundary`). `AgentMessage` and `AgentEvent` are used only by `session-integration.ts`, whose two converter functions are re-exported from the engine barrel and consumed by one test. `AgentEnginePort` and `AgentSessionPort` have no implementer.
- The live command union `OwnedUiCommand` that `PiEngineAdapter.#perform` handles has fifteen variants and strictly contains the eight variants of `AgentCommand`; `AgentEvent` collapses content to text-only messages. Implementing `AgentEnginePort` would create a second, lower-fidelity engine API with no consumer.

## Goals / Non-Goals

**Goals:** make unused code fail the existing type check; remove code with zero consumers; leave behavior, public CLI, packaged output, and the startup graph unchanged.

**Non-Goals:** adding ESLint, Biome, Prettier, or any other dependency; reformatting; touching the ported Pi components other than deleting `system-theme.ts`; changing `OwnedUiCommand` or `OwnedUiEvent`; any multi-agent behavior.

## Decisions

### Use compiler flags, not a linter

`noUnusedLocals` and `noUnusedParameters` are enforced by the `tsgo` type check that `pr-core`, `fast`, and `full-release` already run in about five seconds. They catch unused imports, locals, and parameters, which is the whole observed problem. A linter would add a dependency subject to `check:deprecated` and the dependency-policy gate, a second configuration surface, and a new CI lane. If style rules are wanted later, they are a separate change.

Unused parameters that exist to satisfy an interface are renamed with a leading underscore rather than removed, so signatures stay stable.

### Delete the dormant engine-session contract instead of implementing it

The multi-agent work needs one session-creation entry point. That idea is kept, but it will be re-expressed over the live `OwnedUi*` types in the later `pi-engine-host` change as `OwnedUiSessionFactory`. Keeping `AgentEnginePort` would force every future backend to satisfy two unrelated command and event vocabularies.

The deletion keeps `src/contracts/agent-engine` as an owner because the settings and package types are live. Its description in `docs/architecture/project-structure.md` changes from "agent engine, session, package, and capability ports" to "agent settings and package contracts".

### Update the ledger through its script

`config/baselines/pinned-pi-source-port-ledger.json` records SHA-256 provenance for every ported Pi file. Removing `system-theme.ts` requires regenerating the ledger with `scripts/pi/update-pinned-pi-source-ledger.mjs` so that `check:architecture` keeps passing; the ledger is never edited by hand.

## Risks / Trade-offs

- Enabling the flags may surface unused code in `bin/` and `scripts/` evaluated by `tsconfig.bin.json`; fix those in this change rather than excluding files.
- A test may import a deleted contract export through the engine barrel; the compiler will report it and the test is deleted or narrowed with the export.
- The code-documentation policy (`check:code-documentation`) rejects stale implementation comments that mention deleted symbols; run the changed-files mode after the deletion.

## Planned Evidence

Type check with the new flags on both configurations; `npm run check:architecture` including the regenerated ledger; the `test/contracts/agent-engine` and `test/integrations/pi/engine` suites; strict OpenSpec validation. Record the count of removed unused imports and deleted lines in the acceptance list.
