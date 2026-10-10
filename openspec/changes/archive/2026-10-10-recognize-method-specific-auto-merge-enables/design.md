# Design

## Context

`openspec-acceptance-policy.mjs` reads the PR issue timeline to prove who enabled auto-merge and when. `activeAutoMergeEvent` walks enable and disable events to find the arm still active at a given point; `assertManualAcceptanceMerge` refuses legacy acceptance PRs that were ever armed; and `assertVersion3AcceptanceMerge` requires every abandoned enable before a manual merge to come from the merging maintainer. All three matched only `auto_merge_enabled`.

GitHub delivers `auto_merge_enabled` as the `pull_request` webhook action, which is why the documentation workflow trigger works. The timeline, however, records `auto_squash_enabled` or `auto_rebase_enabled` for the chosen method, while a disable is always `auto_merge_disabled`. On #742 the timeline therefore held a disable with no recognized enable before it, which the walk treats as contradictory provenance.

## Goals / Non-Goals

**Goals:**

- Preserve an authorized maintainer's native auto-merge on the exact finalized version-3 head whatever merge method GitHub records.
- Verify such merges, and manual merges after abandoned method-specific arms, as valid after integration.
- Keep legacy manual-only acceptance refusing any armed history, including method-specific arms.

**Non-Goals:**

- Change which PRs are eligible for the human arm, workflow triggers, or the documentation allowlist.
- Relax staleness rules: a commit or body edit after an enable still invalidates it.
- Repair #742's already-recorded verification inside this change.

## Decisions

### 1. One shared predicate for enable events

A module-level set of the three enable names and an `autoMergeEnabled(event)` predicate replace the three literal comparisons. Repeating the list at each call site was rejected because the three checks drifted from GitHub's naming together and must stay in step.

### 2. Keep the generic name

`auto_merge_enabled` stays in the set. Existing fixtures and any timeline that does carry the generic name keep their current meaning, and removing it would turn a recognized enable into an unknown event.

### 3. Prove behavior with the observed timeline

Policy tests replay #742's order — enable, bot disable, final commit, then two more enable/disable pairs before a manual merge — and the documentation workflow test replays an abandoned arm followed by a current one. Rebase variants cover the other method name. Existing rejection cases continue to run against the generic name; a method-specific bot enable and pre-commit enable are added beside them.

## Risks / Trade-offs

- **[GitHub adds another method-specific name, such as for merge commits]** → Repository protection permits squash integration, and rebase is covered; an unknown name still fails closed as an unrecognized disable sequence rather than granting authority.
- **[Broader recognition accepts an arm that should be refused]** → Recognition only feeds the existing human, App, ordering, actor, and permission checks; no check is loosened.

## Migration Plan

No data migration is required. After merge, #742's archive verification can be re-run to replace its `acceptance-merge-provenance` result.
