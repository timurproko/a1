# Design: release-isolated resident runtime

## Context and required behavior

The present runtime is keyed by user/profile independently of release. The observed state included an 831 host and utility tabs alongside an 834 Agent. This is evidence of a routing/version mismatch, not proof that replacing a host alone fixes every performance symptom. The required correction is deterministic release selection with coexistence, rather than automatically upgrading the existing cohort.

| Launch or operation | Required destination |
| --- | --- |
| First launch of release A under profile P | Start host P/A |
| Second launch of A under P | Reuse host P/A under existing controller rules |
| Launch B under P while A is running | Start or attach host P/B; leave P/A untouched |
| Recovery requested by an A holder/client after activation of B | Recover P/A from A's fixed artifacts |
| Maintenance invoked by B | Inspect or stop P/B only |
| Agent in A already owns session S and B selects S | Existing conflict-safe writer admission; no second writer |

A standalone older solo process remains untouched and must not redirect a newer multitab launch. Rollback chooses the selected older immutable release and its own namespace, rather than adopting another release's host.

## Identity and namespace

Use the existing immutable release-management identity, not the human-facing version string alone, the mutable global active pointer, or an unchecked caller-supplied path. Two payloads with the same displayed version but different immutable identities must not collide. Canonical aliases of the same profile/release must converge. Development builds must carry their existing build-specific identity through this same contract.

Derive one bounded runtime-scope key from canonical profile identity and immutable release identity. Carry it consistently through Windows named pipes, Unix sockets, state directories, registry-writer and startup locks, owner markers, epochs, restart budgets, holder/bridge endpoints, authentication custody, diagnostics and private recovery data. Keep user ACLs, peer checks, first-instance protection, native process-start verification, and socket/path/frame limits intact. Namespace selectors must not enable traversal or create a generic executable/argv override.

Do not change the canonical user profile, credentials/settings locations or session-storage root merely to obtain a different runtime namespace. Existing same-release multi-client attribution and exclusive-controller behavior still apply within that release.

## Exact release admission and fixed-role custody

Resolve launch identity from the selected immutable release before resident discovery. Compare the expected exact identity at admission, before optional capability negotiation. Matching protocol generation alone is insufficient. If discovery or a hermetic endpoint override reaches a different release, refuse it without adoption, cross-release recovery or signalling that owner. Prefer the correct isolated endpoint where available; preserve ordinary bounded failure/fallback behavior for actual launch failures rather than attaching to an older cohort.

Each native role retains the Node executable, fixed role entry, addon custody and release identity of its originating release. Serialize initial startup and recovery per profile/release. A later installation/activation must not retarget replacement servers, holder creation, utility tabs, child restart, journals or recovery budgets to another release. Surviving holders may be readmitted only into the matching release namespace after the existing native identity, incarnation and credential checks.

## Registry and shared-session authority

Every host holds only its own namespace's registry-writer lease and epoch. Two different releases may each hold their separate registry lease simultaneously, while two starters of the same release must still converge on one winner. Silent endpoints and unavailable leases never authorize a second writer or unverified termination.

Session writers are a different authority boundary: keep the existing OS file-identity locks and new-file reservation protocol independent of host release. Shared session selection must not bypass them because the other release's tab is absent from the local registry. A conflict remains an explicit conflict or an existing explicit fork choice; it must not silently copy, migrate, take over or overwrite the active session. Drafts and prompt journals are not replayed during activation.

## Maintenance and release retention

The existing list/status/stop/doctor routes target the invoking release's namespace. This includes direct fallback maintenance against an unresponsive server and all holder/tree termination boundaries. No new all-releases switch is needed for the approved scope. Metadata can identify the target release without adding a new update-banner feature.

Release GC must enumerate all supported release-scoped resident state plus legacy state with bounded, owner-verified traversal. Protect releases referenced by verified live server, holder or child identities. Unreadable/corrupt state, unknown versions and unavailable identity inspection remain conservative retention outcomes, not evidence of absence. Stopping B cannot remove A's artifact hold; stopped cohorts become collectable only under the ordinary verified retention rules.

## Legacy compatibility and rollout

Already installed old binaries continue using their legacy unversioned namespace. New-format releases neither migrate that registry nor probe it as an attach/recovery fallback. Read-only legacy discovery remains available solely to preserve release holds. New and legacy hosts must coexist without either registry, socket removal, lease acquisition, cleanup or stop commands affecting the other.

Implementation must reconcile the canonical architecture's one-host-per-profile and cross-release attach statements. Optional presentation negotiation remains supported only after exact release admission; its historical old-cohort scenario must not remain a loophole for cross-release attachment.

## Required regression matrix

- Same profile/release concurrent starts yield exactly one owner; same-generation different releases yield two independent owners.
- Canonical profile aliases converge; distinct profiles and distinct immutable payload identities stay separate; socket/name lengths remain bounded.
- A successful newer-release launch is not diverted by a live older resident host, legacy namespace, or older solo session.
- Wrong-release handshakes and endpoint overrides fail closed without changing or signalling the other host.
- Activating B while A streams preserves A's server/holder/child identities, admitted input and unfinished turn; new B roles use B artifacts.
- Killing A's isolated fixture server after activation of B recovers A and its existing holders; same-release recovery races retain the existing split-brain and restart-budget guards.
- B maintenance, including unresponsive-host stop and colliding tab IDs, cannot list, mutate, adopt or stop A.
- Cross-release selection of an already-owned session cannot acquire a second OS writer lease; writer exit permits normal later resumption without prompt replay.
- GC retains A and B while either has live or unverifiable state, also retains unknown legacy holds, and releases only fully eligible stopped artifacts.
- Existing exact-artifact responsiveness, custody, permissions, containment and resource limits remain unchanged. Windows and Unix-specific results are separate evidence; isolated fixtures never signal user processes.

## Delivery status and known gaps

Implementation uses a domain-separated digest of the canonical immutable execution root for installed releases, independent of native target and display-version metadata. Standalone fixture entries bind their explicit entry/artifact custody instead. A second domain-separated profile/release digest keeps the existing 20-character endpoint suffix and flat retention layout. Native child admission validates the release root and pins execution to the originating Node executable rather than trusting a caller's runtime choice. See `implementation-evidence.md` for results and explicit platform/environment gaps. Manual testing never stops existing user agents automatically and does not block code-outcome completion.
