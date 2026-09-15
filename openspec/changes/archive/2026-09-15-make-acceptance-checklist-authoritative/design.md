## Context

See `proposal.md` for motivation. PR #412 contains a correctly source-bound generated record, a body whose boxes were checked by the authorized maintainer, passing acceptance CI, and verified manual merge provenance, yet the archive run returned `acceptance-incomplete` because internal task entries remained `pending`. Its checklist also copied generic and task-ledger items that will become repetitive across acceptance PRs and encourage checkbox fatigue.

The acceptance PR must retain a changed file so GitHub can review and merge it. That generated record remains internal immutable source-binding data; it is not maintainer-authored evidence. Existing comment receipts, manual-only merge protection, required CI, archive synchronization, and cleanup gates remain in force.

## Goals / Non-Goals

**Goals:** Make a small implementation-specific checklist plus authorized manual merge the complete human evidence; keep the implementation link as a plain reference; prevent repetitive boilerplate; keep objective checks machine-owned; preserve a durable final-body receipt; allow exact-head selection among historical records; recover #412 after trusted deployment without editing its JSON.

**Non-Goals:** No automatic acceptance merge, no CI bypass, no acceptance from unchecked or modified text, no maintainer JSON workflow, no generic repeated checklist, no copied robot test/task inventory, no automatic known failing-test waiver, and no early claim that archive preparation or integration occurred.

## Decisions

### 1. Source one to three checks from the implementation handoff

Require a reviewed `Acceptance checks` section in the implementation PR before it merges. It contains one to three concise behavior-and-result statements specific to that implementation. For example, a scrollbar change can require that the scrollbar appears on overflow and follows viewport movement; a copy fix names copy behavior instead. The acceptance PR renders the implementation link as plain reference text and copies only those scenarios as checkboxes.

Reject empty sections, more than three items, duplicates, oversized text, known generic review/CI/no-gap/approval/archive wording, and exact checklist reuse by an unrelated implementation. Bind the implementation body digest as already required so later source edits cannot substitute checks.

Alternative rejected: four fixed generic decisions. Repeating the same boxes across many PRs trains maintainers to click without reviewing implementation behavior.

Alternative rejected: deriving checks from every task or automated test. It recreates the robot-sized form the maintainer rejected.

### 2. Make final checked scenarios plus manual merge authoritative

At receipt consumption, regenerate the expected unchecked body from trusted source data, derive its exact all-checked form, and require the final GitHub body to match after only checkbox-state transitions. Bind its digest into the receipt alongside existing exact-head, CI, actor, merge-mode, timeline, and ancestry evidence. Manual merge itself is approval, so no approval checkbox is generated. The internal JSON remains immutable source-binding input and never requires maintainer edits; its pending task labels do not veto a valid checked receipt.

Any missing checkbox, changed wording/order, added item, or extra prose fails closed. This keeps editable PR metadata safe without asking a human to maintain structured files.

Alternative rejected: accepting any body containing checked boxes. That permits removal or replacement of required implementation scenarios.

### 3. Keep objective checks outside the human checklist

Required implementation CI, acceptance candidate CI, exact source head/merge, one-file scope, ancestry, and authorized manual merge provenance remain trusted machine checks. They are neither repeated as human boxes nor overridable by checkmarks. The human list is only the small set of implementation behaviors automation cannot physically accept.

### 4. Reconcile human-attested task bookkeeping only in the archive copy

A verified checklist receipt marks remaining non-mechanical source tasks complete in the staged archived `tasks.md`, preserving the original record, final checklist digest, exact scenario text, and acceptance provenance in `acceptance.md`. The two designated archive-preparation tasks remain tied to their actual evidence-recording and archive-staging operations.

This intentionally treats the authorized maintainer's checked implementation scenarios as the missing human evidence rather than demanding separate JSON evidence links.

### 5. Select acceptance records by exact implementation head

Replace change-wide single-record assumptions with exact expected-path selection using the source implementation head. Multiple retained records for prior heads are historical, not conflicts. Duplicate or contradictory authority for the same exact head still blocks.

This lets a separately deployed correction reevaluate #410/#412 while keeping #412's merged bytes intact, and lets later implementations of the same active change receive their own acceptance.

### 6. Preserve the existing trusted lifecycle

Candidate CI continues to validate record shape, one-file diff, source binding, and referenced machine evidence using trusted base policy. Post-merge reconciliation alone converts the exact all-checked scenario body and authorized manual merge into acceptance. It then enters the existing conservative sync/archive publisher; the archive PR still needs its own CI and documentation auto-merge.

## Risks / Trade-offs

- [Maintainer checks without actually testing] → Checks are implementation-specific, capped at three, reviewed in the source PR, and cannot be replaced with generic boilerplate; authorized explicit affirmation remains the requested human authority.
- [Different agents write repetitive wording] → Reject known generic categories, within-list duplicates, and exact reuse by unrelated implementations.
- [Editable body is weakened before merge] → Require exact trusted text, ordering, item count, all-checked state, and final-body digest.
- [Checkboxes override failed CI] → Re-read required source and acceptance CI independently; objective failures still block.
- [Historical records create ambiguity] → Select by exact source-head path and retain same-head conflict checks.
- [Blanket source-task reconciliation overclaims archive operations] → Reconcile only non-mechanical tasks; mechanical archive tasks remain operation-bound.

## Migration Plan

1. Deliver this as a separate change so `visible-openspec-acceptance` source artifacts accepted in #412 remain unchanged.
2. Deploy curated-check extraction, repetitive-check rejection, body verification, receipt provenance, task reconciliation, and exact-head historical selection together.
3. Verify implementation-specific and adversarial bodies, unauthorized merge paths, objective CI failures, multiple historical heads, #412-shaped recovery, archive staging, and cleanup evidence.
4. After explicit implementation acceptance and merge, let trusted targeted or scheduled reconciliation reevaluate #410/#412 and publish its archive PR automatically.
5. Roll back new acceptance publication if needed while retaining readers for already merged checked-body receipts and all prior records.
