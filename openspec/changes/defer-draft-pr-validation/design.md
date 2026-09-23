## Context

`Development validation` already skips its ordinary impact-selection and protected aggregate jobs for draft pull requests, but its PR Full regression selector still runs for every pull-request event and can launch the complete native suite for an implementation-bearing generated repair draft. When a version-3 implementation is marked ready, Development validation and OpenSpec finalization also start concurrently: validation begins on the active-change head, finalization pushes an archive commit and edits the metadata fence, and later events cancel and replace the first run.

The merge gate correctly requires exact-head evidence, so draft and pre-finalization test execution provides no integration authority. It consumes hosted capacity and makes implementation look like an acceptance loop before the author declares it complete.

## Goals and non-goals

- Schedule no Development test suite for a draft pull request, regardless of selected validation class.
- Start normal validation when an ordinary pull request becomes ready.
- For version-3 implementation delivery, wait until the body carries valid finalized archive and acceptance-manifest metadata, then validate that exact head.
- Cancel stale work when a ready pull request changes or returns to draft.
- Preserve all existing validation scope, lane, evidence, permission, and failure semantics after readiness.
- Do not suppress finalization failures, make a pending candidate mergeable, reuse prior-head evidence, or change non-PR validation entry points.

## Decisions

### 1. Put a trusted readiness classifier before every Development validation path

Add one bounded readiness job that runs only for a non-draft pull request or manual dispatch. It checks out exact-base policy, parses the pull-request implementation fence with the base-controlled metadata parser, and emits an explicit validation decision and reason. Manual dispatch and ready pull requests without an active version-3 association proceed. A valid version-3 association without archive/acceptance-manifest paths reports `awaiting-finalization` and schedules no downstream test or protected aggregate job.

Malformed implementation metadata fails the readiness job rather than launching tests or claiming readiness. A draft event skips the readiness job entirely. This keeps untrusted head code out of the readiness decision and avoids dependency installation.

### 2. Gate both ordinary and complete validation on the same decision

Make impact detection and PR Full regression selection depend on the readiness output. The existing selectors run unchanged only when that output is true. Every dependent documentation, naming, modular, rendering, delivery, and Full regression job therefore remains unreachable for drafts and pre-finalization version-3 heads.

The stable `Development validation required` job keeps its static protected name and is created only for an eligible validation head. A skipped draft or awaiting-finalization run does not emit a misleading successful protected aggregate; branch protection continues to require a successful aggregate attached to the eventual finalized head.

### 3. Use finalization's body update as the exact validation trigger

Initial `ready_for_review` sees the active version-3 fence and defers tests. The finalization workflow pushes the finalized commit; a synchronize event before the body update still defers. Finalization then updates the fence with both emitted paths, and the existing edited event starts validation on the finalized head. The PR-level concurrency key continues to cancel any superseded run.

For ordinary ready pull requests with no version-3 association, the ready event opens validation immediately. Subsequent ready-head changes still run normally and cancel stale work. `converted_to_draft` remains a trigger so it can cancel active validation while scheduling no replacement tests.

### 4. Preserve validation authority after readiness

The change does not alter impact classification, owner selection, Full regression provenance selection, reusable lane coverage, retries, worker limits, timeouts, assertions, evidence binding, or aggregate verification. Scheduled/manual Full regression, manual Development validation, release validation, documentation auto-merge, OpenSpec finalization, and post-merge verification keep their existing authority.

## Validation plan

- Unit fixtures for draft, ordinary ready, active version-3, finalized version-3, legacy association, manual dispatch, and malformed metadata decisions.
- Workflow contracts proving readiness is base-controlled and dependency-free, and proving both impact and Full regression selection depend on its positive output.
- Contracts proving the protected aggregate remains static, only eligible heads emit it, conversion to draft still cancels stale work, and all existing downstream jobs remain required after readiness.
- Strict OpenSpec, workflow parsing, typecheck, architecture/governance, and focused repository-governance validation.
- Hosted observation that draft pushes schedule no test jobs, ready active delivery defers, and the finalized head receives one selected Development validation run.

## Risks and rollout

A readiness classifier that incorrectly identifies finalization could defer required validation. Base-controlled parsing and fail-closed malformed-metadata behavior keep that state visible, while finalization's existing body edit provides the retry event. A body update may be delayed after the finalization push; during that interval the PR remains blocked because no protected aggregate exists.

Workflow changes are evaluated from the pull request candidate, while the classifier itself is loaded from the exact base. This rollout must retain conservative ordinary validation on the finalized candidate and cannot use its own new readiness policy as evidence until hosted checks confirm the resulting workflow behavior.

## Implementation evidence

Pending implementation.

## Known gaps

Hosted lifecycle behavior remains to be observed after implementation and finalization.
