## Context

See `proposal.md` for the problem. The observed case is [PR #316](https://github.com/timurproko/a1/pull/316), head `95effbdbf207e59bf3c881a78acec7ddbd5a80c9`. [Development validation](https://github.com/timurproko/a1/actions/runs/34687794357) succeeded. The [pull-request policy run](https://github.com/timurproko/a1/actions/runs/34687794521) and [validation-completion policy run](https://github.com/timurproko/a1/actions/runs/34687826807) both failed with a GraphQL `UNPROCESSABLE` error at `enablePullRequestAutoMerge`: `Pull request Pull request is in unstable status`.

The first cause of GitHub's unstable state is not established by those logs. The actionable defect is deterministic: `planDocumentationAutoMerge` returns `arm` for non-clean, unarmed heads, and `graph` throws for every GraphQL error. The armed path also reconciles directly only from `clean`. A failed policy check can leave an otherwise validated documentation PR unable to leave this path.

## Goals / Non-Goals

**Goals:**
- Distinguish merge readiness, validation identity, eligibility, and API failure rather than using `clean` as a proxy for all four.
- Recover both unarmed and armed eligible unstable heads without weakening protected-branch integration.
- Make state-race handling testable with the existing fake-GitHub manager harness.

**Non-Goals:**
- No application or shortcut changes, new dependencies, repository settings, check-name changes, bypass actors, permissions, or workflow triggers.
- No broad retry wrapper or suppression of arbitrary GitHub errors.
- No automatic integration of code/operational PRs and no cleanup without confirmed merge.

## Decisions

### 1. Use validation identity plus explicit mergeability

Extend the planner input/declaration with GitHub's separate `mergeable` value. Eligible heads with matching successful Development validation may use the existing REST squash-merge endpoint when the state is `clean` or `unstable` and mergeability is positively established. Both armed and unarmed reconciliation use this decision, rather than returning `unchanged` before examining a validated armed head. Preserve arming behind pending required validation where GitHub permits it; unknown/conflicting states defer within the existing bounded reconciliation budget.

A direct merge keeps `{ sha: expectedHeadSha, merge_method: "squash" }` and the ordinary workflow token. GitHub remains the final authority for required checks, review threads, and protection. The aggregate `UNSTABLE` status is not permission to bypass anything, but neither is a non-required check an additional required gate. Missing, pending, failed, or stale validation never authorizes a direct merge.

Alternative rejected: merely catch the unstable error and exit. That makes the check green but does not recover already-stuck validated PRs. Also reject arming on every unknown state or weakening protections to force integration.

### 2. Recover only the documented arming-state rejection

Retain structured GraphQL error information. Recognize only a successful HTTP GraphQL response whose errors all identify `enablePullRequestAutoMerge`, the expected `UNPROCESSABLE` type, and the unstable-status message. Authentication, permissions, unrelated GraphQL errors, mixed error sets, transport failures, and malformed responses still fail.

On the recognized race, re-read the PR and complete changed-file list, reconstruct trusted eligibility, and compare the refreshed head with the validated SHA before any new merge/enable action. Reuse the existing bounded polling budget; do not create unbounded recursive retries or increase workflow timeout. If a safe action is not established within the budget, emit a distinct deferred summary and return without claiming validation or integration success. Existing validation-completion events perform the next reconciliation; an explicitly rerun validation-completion workflow can recover a previously stuck current head without an empty commit.

### 3. Share protected integration and confirmed cleanup

Use the same expected-head protected merge and already-merged reconciliation in armed, unarmed, and refreshed paths. If a merge request loses a race, fetch current PR state and accept only a confirmed merge of the expected head. Preserve the existing synchronous `executeMergedBranchCleanup` identity checks. Closure without merge, changed heads, and unexplained merge refusals must not produce branch deletion.

Do not reuse classification across a refreshed head, draft/base/repository change, or newly fetched diff. Keep existing disable-on-ineligibility and classification-failure behavior. Summary messages must distinguish a validation failure from an unknown-mergeability wait or harmless arming deferral.

### 4. Exercise the complete manager, not only its planner

Extend `test/repository-governance/documentation-auto-merge.test.ts` with configurable PR snapshots, changed-file responses, GraphQL errors, mergeability values, and merge refusals. The current harness always succeeds at GraphQL, which hides this bug. Assert requests and forbidden requests as well as exit status and summaries.

Cover validated unstable heads with and without armed auto-merge; blocked-to-unstable arming races; missing/stale/failed validation; unknown/conflicting mergeability; changed head/draft/base/repository/diff during refresh; unrelated and mixed API errors; concurrent same-head merge; close without merge; protected merge refusal; and confirmed cleanup only after integration.

## Risks / Trade-offs

- [GitHub changes error wording] → Match the known rejection narrowly; an unrecognized response remains a visible failure rather than broadening authority.
- [State changes between reads and mutation] → Refresh eligibility during recovery, enforce expected SHA on merge, and rely on protected GitHub integration without bypass.
- [Positive mergeability still does not guarantee acceptance] → Preserve and report server refusals; never turn a rejected merge into a successful cleanup.
- [Recovery defers without another event] → Report the deferred reason and support rerunning the existing validation-completion run; do not add an unreviewed scheduler.
- [The trusted workflow cannot run a PR's proposed script] → Validate with fake-GitHub tests before merge, then verify the live lifecycle after the accepted code reaches the default branch.

## Migration Plan

No persisted data or GitHub-policy migration is needed. Deploy the script/declaration/test change together after this specification is accepted. Verify deterministic tests and required CI, then obtain manual acceptance for the code PR. After code integration, re-run current-head validation reconciliation for #316 if it remains open, or use an isolated eligible documentation PR; record the validated head, workflow run, squash merge, and remote-ref cleanup.

If this specification's own auto-merge hits the same existing bug, a normal protected manual squash merge after its required validation passes can bootstrap the policy update. Do not disable checks or use an administrative merge. Rollback reverts the script and declaration changes together; it does not change branch protections or restore already-cleaned topic branches.
