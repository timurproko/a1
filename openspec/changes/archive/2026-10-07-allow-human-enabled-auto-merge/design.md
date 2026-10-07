## Context

See `proposal.md` for motivation. Version-3 acceptance currently calls `assertManualAcceptanceMerge`, requires `pull.auto_merge === null`, and rejects the mere presence of `auto_merge_enabled`. The documentation auto-merge manager independently disables every armed implementation-bound PR. Consequently, an authorized maintainer cannot use GitHub's native auto-merge, and even a disabled attempt permanently invalidates a later manual merge.

PR #709 demonstrates both problems. Its timeline contains the finalized head commit, `auto_merge_enabled` by `timurproko`, `auto_merge_disabled` by trusted policy, and then a matching manual `merged` event by `timurproko`. Exact-head required validation passed, the integrated bytes are correct, and the remote branch is absent, but the shared reader and cleanup fail with `acceptance-merge-provenance`.

GitHub exposes the active native-auto-merge actor as `pull.auto_merge.enabled_by`, preserves ordered `committed`, `auto_merge_enabled`, `auto_merge_disabled`, and `merged` timeline events, and reports the merge actor and commit independently. These immutable fields allow human intent to be distinguished from bot/App or stale-head authority.

## Goals / Non-Goals

**Goals:**

- Let an authorized maintainer choose native auto-merge for a finalized version-3 candidate while exact-head checks are pending or complete.
- Bind that choice to the final head and acceptance list rather than treating generic CI success as acceptance.
- Preserve manual merge and make a disabled human auto-merge attempt harmless to a later valid manual merge.
- Keep agent, bot, App, documentation automation, and merge queue authority invalid for implementation acceptance.
- Make the shared reader's new rule apply consistently to status, archive verification, audit, and cleanup, including PR #709.

**Non-Goals:**

- Allowing agents or repository workflows to arm implementation auto-merge.
- Allowing merge queue, App/bot merges, stale heads, changed acceptance lists, missing checks, or unauthorized actors.
- Changing documentation-only or release-reopening auto-merge ownership.
- Rewriting merged PR timelines, manifests, archive bytes, or `develop` to repair provenance.
- Automatically accepting an open PR merely because auto-merge is armed.

## Decisions

### 1. Model authorized integration as manual merge or human-armed native auto-merge

The acceptance policy will retain the existing merge identity, permission, merge-event, merge-commit, timing, exact-head validation, manifest, and ancestry checks. It will then accept either:

1. a direct manual merge with no active auto-merge authority; or
2. native auto-merge whose `enabled_by` actor is the same authorized `User` recorded as `merged_by`, whose matching timeline enable event follows the final committed head, and whose merge event remains non-App and commit-exact.

Merge queue events remain unconditionally invalid. An App/Bot arming actor, a different merge actor, missing or unknown fields, duplicate/ambiguous events, or insufficient repository permission fails closed.

Treating any `auto_merge` object as acceptance was rejected because trusted documentation automation and bots also use native auto-merge. Treating the merge actor alone as sufficient was rejected because it would not prove who armed the automatic action.

### 2. Bind human arming to the final candidate

Timeline order will establish that the last committed PR event before arming identifies `pull.head.sha`, and no later committed event may intervene before merge. The documentation-policy workflow will disable a human arm when a synchronize, finalization/body edit, draft conversion, or other candidate-changing event occurs; the maintainer must arm it again after the final head and acceptance list are visible. Required validation still has to succeed for that exact head and body before GitHub can integrate it.

This preserves the current rule that a new commit or acceptance-list edit requires a new human decision. Allowing an arm to float across later commits was rejected because it would accept bytes the maintainer had not selected.

### 3. Preserve human arms; never create them

The documentation auto-merge manager will recognize a non-draft, same-repository, `develop`-targeting version-3 implementation PR with native auto-merge enabled by an authorized human. For that narrow case it will leave the arm intact and report that implementation integration remains owned by the maintainer's choice. It will not call the enable mutation itself.

Malformed lifecycle metadata, non-version-3 implementation, unauthorized or automated actors, changed candidate events, forks, drafts, wrong bases, merge queue, or unavailable provenance will retain the existing disable behavior. Documentation and release-reopening automation continue to arm only their established non-implementation routes.

### 4. A disabled attempt does not poison a later manual merge

When `pull.auto_merge` is null at merge and the ordered timeline shows an `auto_merge_enabled` event followed by `auto_merge_disabled` before the valid human `merged` event, acceptance will use the ordinary manual path. The abandoned automatic attempt supplied no integration authority and therefore is not contradictory provenance.

This permits PR #709 to verify without rewriting history. Ignoring an enable event that remained active was rejected because that could misclassify an automatic merge as manual.

### 5. One shared provenance decision serves audit and cleanup

The existing acceptance helper will be generalized and consumed by version-3 archive readers, legacy acceptance readers where applicable, status reconciliation, and local cleanup. Tests will cover direct manual merge, disabled attempts, successful human-armed auto-merge, stale-head arming, bot/App actors, mismatched actors, queue events, missing permissions, malformed timelines, and PR #709-shaped evidence.

Guidance and generated manifest wording will describe authorized human integration rather than claiming every accepted delivery was manually merged. Historical valid manual receipts remain readable unchanged.

## Risks / Trade-offs

- **[GitHub fields differ between manual and automatic merges]** → Require explicit reviewed fixtures for retained `auto_merge`, `enabled_by`, timeline order, merge actor, and merge event; unknown shapes fail closed.
- **[A human arm survives a candidate change]** → Disable on synchronize/body/finalization events and independently reject an enable event that precedes the final committed head.
- **[Documentation automation accidentally gains implementation authority]** → The manager may preserve a qualifying human arm but SHALL never invoke its enable mutation for an implementation-associated PR.
- **[A disabled attempt is confused with active automation]** → Require ordered enable-then-disable evidence and `pull.auto_merge === null` before using the manual route.
- **[Historical re-evaluation changes cleanup eligibility]** → Reuse the same shared reader and all existing archive/spec/check/ancestry/ref safeguards; only the provenance result changes.

## Migration Plan

1. Update policy, manager behavior, guidance, generated wording, and focused fixtures in one implementation-bound PR.
2. Merge this policy PR manually under the current rules; do not use auto-merge for its bootstrap.
3. Re-run read-only reconciliation for PR #709. If its immutable evidence matches the new disabled-attempt/manual route, report accepted-and-archived.
4. Run candidate-scoped cleanup for #709 only after successful shared-reader verification and remote-ref absence.

Rollback restores the previous strict manual-only rule. Already accepted manual deliveries remain valid; a human-auto-merged delivery would become unverifiable under rollback and its local cleanup would remain blocked rather than mutating repository history.
