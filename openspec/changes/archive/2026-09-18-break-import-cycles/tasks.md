## 1. Release subsystem

- [x] 1.1 Add `src/foundation/release/types.ts` with `UpdateChannel` and `DependencyLayerReference`; point `update-transaction.ts`, `update.ts`, `dependency-layer.ts`, and `release.ts` at it; keep `update.ts` and `dependency-layer.ts` re-exporting the names.
- [x] 1.2 Move `readEndpointMetadata`, `probeOwnership`, `requestIdentity`, `isStringArray`, and `removeEndpointArtifacts` from `bootstrap.ts` to `endpoints.ts` with their imports; `bootstrap.ts` and `update.ts` import the three public helpers from `endpoints.ts`.

## 2. Session shell

- [x] 2.1 Add `src/integrations/pi/session-ui/paste-types.ts` with `ClipboardPath` and `PreparedPasteText`; `paste-text-preparation.ts` imports and re-exports them; `path-chip-presentation.ts` imports them from the new module.

## 3. Scanner and baseline

- [x] 3.1 Bound the import clause with `[^;]*?` in `runtimeRelativeImports` (`startup-graph-policy.mjs`) and in `STATIC_IMPORT` (`module-graph-policy.mjs`); add a fixture case to each policy test with a bare-specifier import before a relative `import type`.
- [x] 3.2 Re-pin `config/startup-graph-baseline.json` to the corrected exact totals (137 files, 1,381,566 bytes) and repoint `src/features/launch/intent.ts` at `foundation/lifecycle/index.js` now that it is no longer an eager leaf.
- [x] 3.3 Empty `importCycles` in `config/architecture-allowlist.json`.
- [x] 3.4 Run `npm run check:architecture`, `npm run typecheck`, `check:code-documentation`, and the repository-governance, release, supervision, session-ui paste, and cli suites; record outcomes: architecture OK with zero cycles, typecheck clean, documentation OK, 1544 passed; the remaining failures were build-dependent package integration tests, the local-cleanup node suite (`worktree-head-mismatch` in this nested worktree), and the update-activation performance test's 38 s local timeout, none touching changed code.
