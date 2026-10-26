## 1. Release-scoped runtime authority

- [x] 1.1 Resolve and carry the selected immutable release identity through resident launch without replacing the canonical user profile or shared session roots.
- [x] 1.2 Partition native endpoint discovery, state directories, registry/startup leases, owner markers, epochs, restart budgets and private role state by canonical profile and release identity.
- [x] 1.3 Add same-release startup-race, different-release coexistence, profile-alias, immutable-identity, permissions and bounded-path regressions.

## 2. Exact admission and pinned recovery

- [x] 2.1 Admit attach, holder and bridge peers only into the exact matching release, including hermetic endpoint paths and same-generation mismatches.
- [x] 2.2 Preserve originating fixed Node/entry/addon/release custody for server recovery, utility/prewarm creation, holder launch and tab restart after another release activates.
- [x] 2.3 Leave legacy namespaces untouched and exclude them from new-release attach, mutation and recovery fallback.
- [x] 2.4 Add isolated legacy/new coexistence, update-mid-turn, wrong-release refusal, recovery-race and pinned-artifact regressions without stopping user processes.

## 3. Release-local maintenance and conservative retention

- [x] 3.1 Scope list, status, stop, stop-all, doctor and unresponsive-server fallback to the invoking release's runtime and verified process trees.
- [x] 3.2 Enumerate all release-scoped and legacy resident holds for release GC while retaining releases on unreadable state or unavailable native identity evidence.
- [x] 3.3 Add colliding-tab-ID, cross-release stop isolation, live-holder/child retention, legacy retention and eligible-stopped-release cleanup regressions.

## 4. Shared-session safety and delivery contracts

- [x] 4.1 Preserve profile-neutral process-owned session locks and conflict-safe selection across releases, without automatic fork, takeover or prompt replay.
- [x] 4.2 Add cross-release existing-file/new-file writer-conflict and release-after-exit cases alongside retained single-release session behavior.
- [x] 4.3 Reconcile architecture and affected contracts to release-isolated hosts, including removal of newer-client reuse as an allowed update route.
- [x] 4.4 Complete scoped typecheck, touched tests, strict OpenSpec validation and applicable native/exact-artifact regressions without changing latency or resource budgets; record actual results and any explicit gaps before final readiness.
