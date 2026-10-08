## 1. Scoped Locking and Atomic State

- [ ] 1.1 Add canonical path/ref resource keys and heartbeat-backed scoped leases with deterministic multi-resource ordering; verify fixtures cover disjoint acquisition, same-resource deferral, dead-holder eviction, live-holder retention, and audit records.
- [ ] 1.2 Restrict the existing `mutation.lock` to bounded fresh-state transactions while retaining old-worker compatibility; verify a legacy holder is honored and ordinary short transaction overlap retries without losing state.
- [ ] 1.3 Add candidate-local compare-and-transition state helpers for ownership, journal steps, enablement, relocation, and cursor updates; verify two overlapping candidate updates both survive and stale generation/state/step writes fail closed.

## 2. Candidate-Scoped Operations

- [ ] 2.1 Convert register, claim, release, forget, hand-off, and exact completed cleanup to path/ref leases plus short state transitions; verify same-candidate ownership remains exclusive while a paused candidate does not delay a disjoint completion.
- [ ] 2.2 Convert closed-unmerged discard and redundant retirement to the same scoped protocol; verify separate worktrees can overlap while shared paths/refs, remote deletion races, partial journals, and repeated invocations remain safe.
- [ ] 2.3 Coordinate shared remote-tracking fetches and exact Git ref mutations only for the resource-changing command; verify concurrent candidates avoid ref-lock collisions and retain immediate evidence/identity revalidation.

## 3. Sweep and Auxiliary Cleanup

- [ ] 3.1 Refactor reconciliation to snapshot candidate IDs and process each registration under its own lease with atomic cursor/journal updates; verify sweep defers a held candidate and continues to remove an eligible disjoint candidate.
- [ ] 3.2 Apply exact path/ref leases to unmanaged empty-directory removal and merged-branch pruning; verify these operations cannot race candidate cleanup or ownership for the same resource and do not block unrelated paths/refs.
- [ ] 3.3 Make report creation and bounded retention safe under concurrent writers and update CLI line reporting for scoped deferral; verify concurrent reports remain valid, credential-free, and independently authoritative.

## 4. Concurrency Evidence and Guidance

- [ ] 4.1 Add deterministic barrier-based process fixtures covering overlapping evidence reads, content scans, generated purge, Windows locked-residue retries, Git worktree removal, interruption, stale locks, and no-lost-update recovery; verify the focused cleanup suites pass without timing-only assertions.
- [ ] 4.2 Update local cleanup guidance and CLI help to describe parallel disjoint cleanup, same-resource deferral, brief shared-state coordination, rollout compatibility, and unchanged confirmation/authorization boundaries; verify documentation examples use repository-owned commands only.
- [ ] 4.3 Run focused cleanup fixtures, governance validation, typechecking, strict OpenSpec validation, and diff checks; record implementation evidence and dispose every known gap before finalization without running unrequested local full suites.
