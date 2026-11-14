# Implementation evidence

## Shared runtime lifecycle

Both normal-product parsers select the same profile; UI entry now passes a captured immutable runtime context to composition. Color control and repository/worktree context use that identity even if asynchronous engine/extension startup changes the process environment. Settings reset/start/disposal and endpoint-publication readiness now have focused feature lifecycle owners. Comparison and embedded no-claim contexts retain their existing exclusions.

The added lifecycle tests (5) and existing endpoint-readiness tests (2) passed. Both new normal/compatible composition identity cases passed. A larger run of the existing session-runtime-wiring file passed 20 cases but its unchanged title-case naming case exceeded the existing five-second timeout and encountered a Windows EBUSY during fixture cleanup. Neither its timeout nor its assertions were changed; a focused rerun remains to be reported.

Ownership extraction initially made the reporter eager through the settings lifecycle. Split endpoint readiness into its own lazy-loaded module instead. Startup reachability contains exactly two additional small eager modules (runtime context and settings/API lifecycle), with total source bytes still below the unchanged startup byte ceiling; only the file-count baseline moves from 201 to 203. No optional-module exemption or byte-budget increase is added. Composition's size ratchet is retained.

## Ordered intent and settlement

The tracked regression `herdr-binding.test.ts` / `retains successor eligibility while an ordinary predecessor publication is in flight` failed before the correction: expected a successor reservation but received undefined, with exit 1 (294 ms fixture duration). It passed after the correction.

Short intent ordering uses a separate bounded metadata transaction. Existing committed v1 owner/publication records and their original I/O guard remain authoritative for actual Core operations. Pending intent can survive a busy I/O fence but cannot promote over a newer intent or changed committed legacy owner. The reporter rechecks intent after public reads; cleanup never promotes a pending owner. Unsettled writes retain the original guard, preventing all successor Core calls while allowing harmless intent ordering.

Focused binding, reporter, lifecycle and readiness selection passed 27 tests after the correction. New reporter cases cover delayed predecessor settlement, multiple pending successors, revocation during a read, disposed pending startup and participating legacy reservation/publication lineage. The unsettled-write regression now additionally asserts that a pending successor makes zero Core calls and cannot mutate labels, rather than requiring ordering itself to fail.

## Remaining scope

Outcome 3, final focused validation and exact-head CI are not yet complete. The historical pc2 incident's exact cause remains unverified. No private live inventory, live labels, user sessions or external project source was changed. No release, restart, live tab move or merge is authorized.
