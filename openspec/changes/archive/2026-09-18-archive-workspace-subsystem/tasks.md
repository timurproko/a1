## 1. Archive and delete

- [x] 1.1 Create and push `archive/multi-agent-workspace` from `0a70298f`; record it in the on-hold proposal.
- [x] 1.2 Delete `src/features/workspace`, `src/contracts/workspace`, `src/foundation/structured-agent-runtime`, `src/foundation/native-host-protocol` and their `test/` counterparts.

## 2. Control store

- [x] 2.1 Rewrite `migrate()`: fresh path creates `launch_instances` and `product_identity` at version 7; chain step `version <= 6` drops the nine retired tables children-first; remove the workspace, topology, terminal-session, recovery-reference methods and `reconcilePriorBootGenerations`; drop the `contracts/workspace` imports.
- [x] 2.2 Rewrite `test/foundation/storage/storage.test.ts`: fresh schema has exactly two tables; a hand-built version-6 database with rows in every retired table migrates to version 7 keeping launch instances; a newer version is refused; interrupted-migration rollback still holds.

## 3. Governance and registries

- [x] 3.1 Remove the four owners from `project-structure-policy.mjs` and `workspace-contracts` from `storage`'s imports; drop the retired-directory rules from `check-architecture.mjs`; drop `src/contracts/workspace/` from `startup-graph-policy.mjs` and `src/features/workspace/` from `validation-impact.mjs`.
- [x] 3.2 Remove the `structured-runtime` owner from `config/integration-owners.json`, its scope and test entries from `config/validation-suites.json`, the paths and owner reference from `config/validation-ownership.json`, the owner from `validation-matrix.mjs`, and the sample from `generate-development-validation-replay.mjs`; drop the three `native-host-protocol` members from `config/internal-naming-policy.json`; regenerate `config/product-identity-legacy-inventory.json` and the allowlist (75 to 74).
- [x] 3.3 Remove the sixteen entries from `config/architecture-allowlist.json`.
- [x] 3.4 Update `project-structure-policy`, `validation-tier`, `validation-suite-policy`, `validation-job-selection`, `integration-owner-registry`, `naming-inspection`, `terminal-architecture-policy`, `native-host-boundary`, `resource-data-policy`, and `resource-sensitive-validation` tests to the new owner, scope, and partition sets.

## 4. Documentation and proof

- [x] 4.1 Remove the four entries from `docs/architecture/project-structure.md` and `boundaries.md`, add the archive note to the planned multi-agent boundaries section, and point the terminal-host proof and evidence documents at the archive branch.
- [x] 4.2 Run `npm run check:architecture`, `npm run typecheck`, `check:code-documentation`, the docs governance check, and the repository-governance, storage, supervision, and launch suites; record outcomes: `check:architecture` OK (allowlist down to `tui-runtime/conformance.ts`), `npm run typecheck` clean, `check:code-documentation` OK, docs governance OK (74 legacy occurrences), suites 1315 passed plus the stale-lease launch test rewritten for version 7; the only remaining failure was the known `terminal-architecture-policy` spawn timeout under parallel load.
