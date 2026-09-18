# Design

## Delete, do not relocate

Each deleted module was checked three ways: its only static importer is a barrel that production never loads, no `bin/`, `scripts/`, or `package.json` entry names its built file, and the only tests that touch its exports are its own unit tests. `composition/process.ts` is the older `composeProcess` root that `composition/owned-ui.ts` replaced; its `agent-engine-bridge.ts` translated owned-UI events into agent-engine events for that root only. The three engine integrations were early adapter collaborators the adapter absorbed. The three vendored components are Pi surfaces bare A1 never shows (first-time setup, custom entry, markdown transform). `route-host.ts` re-exported two types from `ui/apps`; the barrel now points at the owner directly. Git keeps every deleted file at `d35a3053` if any of them is wanted back.

## Type-only modules

Reachability walks runtime edges because a type-only import loads nothing. A module whose every export is a type therefore appears unreachable even when live modules depend on it, which is what happened to `prompt-input-port.ts`. The gate now classifies a module as type-only when its source has no runtime export (`export const|let|function|class|enum|default`, or a non-`type` `export { ... }`/`export * from`) and judges such a module by static edges instead. Deleting a type module that a live module type-imports still fails typecheck, so nothing is lost; the gate simply stops asking the wrong question. A fixture case proves a type-only module reached only by `import type` passes and an ordinary module reached only by `import type` still fails.

## Ledger records

`pinned-pi-source-port-ledger.json` records each copied Pi file with its local destination and hash; the stale-path gate from #471 would fail on the three deleted destinations, so their records go with the files and the ledger check's record and behavior counts in `pinned-pi-source-ledger.test.ts` are updated to the new totals. `pi-component-adaptation.test.ts` compares the ledger against the vendored directory, so removing both sides keeps it consistent.
