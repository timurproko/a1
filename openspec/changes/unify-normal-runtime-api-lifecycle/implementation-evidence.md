# Implementation evidence

## Shared runtime lifecycle

Both normal-product parsers select the same profile; UI entry now passes a captured immutable runtime context to composition. Color control and repository/worktree context use that identity even if asynchronous engine/extension startup changes the process environment. Settings reset/start/disposal and endpoint-publication readiness now have focused feature lifecycle owners. Comparison and embedded no-claim contexts retain their existing exclusions.

The added lifecycle tests (5) and existing endpoint-readiness tests (2) passed. Both new normal/compatible composition identity cases passed. A larger run of the existing session-runtime-wiring file passed 20 cases but its unchanged title-case naming case exceeded the existing five-second timeout and encountered a Windows EBUSY during fixture cleanup. Neither its timeout nor its assertions were changed. That exact title-format case subsequently passed unchanged in isolation (one passed, 20 intentionally unselected), with no EBUSY cleanup failure.

Ownership extraction initially made the reporter eager through the settings lifecycle. Split endpoint readiness into its own lazy-loaded module instead. Startup reachability contains exactly two additional small eager modules (runtime context and settings/API lifecycle), with total source bytes still below the unchanged startup byte ceiling; only the file-count baseline moves from 201 to 203. No optional-module exemption or byte-budget increase is added. Composition's size ratchet is retained.

## Ordered intent and settlement

The tracked regression `herdr-binding.test.ts` / `retains successor eligibility while an ordinary predecessor publication is in flight` failed before the correction: expected a successor reservation but received undefined, with exit 1 (294 ms fixture duration). It passed after the correction.

Short intent ordering uses a separate bounded metadata transaction. Existing committed v1 owner/publication records and their original I/O guard remain authoritative for actual Core operations. Pending intent can survive a busy I/O fence but cannot promote over a newer intent or changed committed legacy owner. The reporter rechecks intent after public reads; cleanup never promotes a pending owner. Unsettled writes retain the original guard, preventing all successor Core calls while allowing harmless intent ordering.

Focused binding, reporter, lifecycle and readiness selection passed 27 tests after the correction. New reporter cases cover delayed predecessor settlement, multiple pending successors, revocation during a read, disposed pending startup and participating legacy reservation/publication lineage. The unsettled-write regression now additionally asserts that a pending successor makes zero Core calls and cannot mutate labels, rather than requiring ordering itself to fail.

## Packaged producer and membership-driven convergence

A new two-case integration runs the extracted npm package's actual compatible entry through authenticated immutable bootstrap, independent UI entry, real composition/settings/SDK and a loaded asynchronous extension. Its normal-A1 peer starts through the ordinary public entry. Only Core is replaced with disposable supported-command adapters; stdout/stdin are pipes rather than a real terminal or PTY. The extension uses the public SDK to request replacement and graceful shutdown from fixture-only control files; no terminal input is injected and no model request is made.

Public native labels match the real session/runtime reported by the loaded extension. The test calls the extracted package's public color CLI, proves destination cyan after inactive-tab fixture membership/adoption agreement, refuses old and adoption-unacknowledged captures, preserves the ordinary peer's orange and the unchanged settings document, and rejects a pending capture after real SDK replacement. Replacement restores the invocation's green without changing Default. A subsequent compatible launch in the same disposable terminal publishes a different current runtime/session without manual label clearing or file repair.

Both local and routed Core-only machine fixtures passed. Routing chooses the respective isolated machine context; this is deterministic routing coverage, not an SSH or physical remote-machine certification. The 12-case consumer fixture suite additionally covers stale/future/partial/foreign/stopped identities, legacy precedence, moved-again membership, expiry, mismatched responses and unavailable/ambiguous control without a fallback session. Existing endpoint transport assertions remain intact.

Validation: the seven-file compatible producer/consumer, real extension lifecycle, session-color CLI/transport and Core-command selection passed 55 tests with one Unix-only subprocess case skipped on Windows. Source/bin typecheck, architecture/writer/product/ledger checks and strict OpenSpec validation passed. The earlier five-file ownership/readiness/subprocess selection passed 29 tests. The intentionally failing-before contention regression passed afterward. No broad preflight/full/release suite was run. Final source/bin build/typecheck and architecture checks passed again; the final lifecycle/readiness/packaged-launch selection passed all 10 tests, including coalescing 99 replacements into two endpoint publications. Changed-code documentation governance and the naming audit passed. The two identity-parity cases and three directly relevant neutral transport cases also passed in a five-test filtered run (23 cases intentionally unselected).

## Known gaps and scoped disposition

- The historical pc2 incident's exact cause remains unverified. This delivery corrects the reproduced shared contention defect and enforces shared API identity; it does not claim a forensic diagnosis or in-place repair of that immutable process.
- Real desktop focus/tab moves, actual SSH/Core-only hosts and deployed Firstmate/Custom acceptance remain unperformed, as required by the approved fixture-only scope. The consumer production source and deployment are unchanged. The maintainer may separately authorize live confirmation later; it is not a hidden implementation task or a claimed pass.
- Extracted-package tests use the pinned task dependency installation through a fixture junction. Clean-install/release certification and publication are not claimed by these focused checks.
- Persistent locks, unsettled writes, foreign/partial labels and conflicting legacy ownership intentionally remain blocked. Automatic crash-residue recovery and user coordination repair are excluded rather than unresolved implementation work.
- The pre-existing naming-case timeout/cleanup failure was not relaxed; its unchanged isolated rerun passed. Broad CI remains responsible for exact-candidate validation, not an inferred local pass.

No private live inventory, live labels, user sessions or external project source was changed. No release, restart, live tab move or merge is authorized. Trusted automation owns readiness/finalization and exact-head CI; editing ownership stays with this attached task checkout.
