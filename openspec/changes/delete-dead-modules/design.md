# Design

## Delete, do not relocate

Each deleted module was checked three ways: its only static importer is a barrel that production never loads, no `bin/`, `scripts/`, or `package.json` entry names its built file, and the only tests that touch its exports are its own unit tests. `composition/process.ts` is the older `composeProcess` root that `composition/owned-ui.ts` replaced; its `agent-engine-bridge.ts` translated owned-UI events into agent-engine events for that root only. The three engine integrations were early adapter collaborators the adapter absorbed. The three vendored components are Pi surfaces bare A1 never shows (first-time setup, custom entry, markdown transform). `route-host.ts` re-exported two types from `ui/apps`; the barrel now points at the owner directly. Git keeps every deleted file at `d35a3053` if any of them is wanted back.

## Type-only modules

Reachability walks runtime edges because a type-only import loads nothing. A module whose every export is a type therefore appears unreachable even when live modules depend on it, which is what happened to `prompt-input-port.ts`. The gate now classifies a module as type-only when its source has no runtime export (`export const|let|function|class|enum|default`, or a non-`type` `export { ... }`/`export * from`) and judges such a module by static edges instead. Deleting a type module that a live module type-imports still fails typecheck, so nothing is lost; the gate simply stops asking the wrong question. A fixture case proves a type-only module reached only by `import type` passes and an ordinary module reached only by `import type` still fails.

## Ledger records

`pinned-pi-source-port-ledger.json` must hold one record for every source unit the pinned Pi package ships, so the three deleted components cannot simply lose their records. They take the classification the ledger already uses for units A1 does not port, `public-api-reuse` with `available-through-pinned-package`, pointing at the shared components barrel the way the other 52 such records do; the copied-file hash goes with the copy. The ledger check keeps its 109 records and 29 behaviors, the stale-path gate from #471 sees no deleted destination, and `pi-component-adaptation.test.ts` still finds no unrecorded port.
