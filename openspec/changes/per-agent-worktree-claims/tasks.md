## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Eighth preparatory change for multi-agent tabs; independent of the UI sequence and may start after `multi-agent-prep-hygiene` merges. Reconcile `origin/develop` first; if `pi-engine-host` has merged, take the agent id from the session identity port, otherwise use `"primary"` for the single session and leave a one-line adapter seam.

## 1. Records and keys

- [ ] 1.1 Add `agentId` and `formatVersion` to claim and runtime records in `src/foundation/lifecycle/session-repository-context.ts`; read version 1 as `agentId: "primary"` and rewrite on first write.
- [ ] 1.2 Change `releaseClaimsOwnedBy` to `(runtimeId, agentId, gitDir)` and add `releaseRuntimeClaims(runtimeId)`; make `activateSessionRepositoryContext` and `releaseSessionRepositoryRuntime` use them respectively.

## 2. Lock ownership

- [ ] 2.1 Write `{ pid, startIdentity, acquiredAt }` into `mutation.lock`; on contention, inspect the owner with the injected `inspectProcess` and evict only on proven death via atomic rename.
- [ ] 2.2 Keep the existing poll bound for live or unverifiable owners.

## 3. Composition and CLI

- [ ] 3.1 Replace `activeSessionIdentity` in `src/composition/owned-ui.ts` with a per-agent map; iterate it in the refresh and release paths.
- [ ] 3.2 Add the `agent` column to the `a1 session worktrees` presenter and update its tests.

## 4. Validation evidence

- [ ] 4.1 Add the lifecycle tests named in `design.md` under `test/foundation/lifecycle`.
- [ ] 4.2 Run `npm run typecheck` and the `test/foundation/lifecycle`, `test/cli`, and `test/composition` owners; record the migration behavior for version-1 records in the acceptance list.
