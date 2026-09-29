## Context

`develop` requires strict current-base status checks. A merge therefore invalidates every otherwise-ready pull request whose branch does not contain the new base. GitHub exposes an **Update branch** operation, but the repository has no owner that invokes it for all ready pull requests. Using `GITHUB_TOKEN` would be insufficient because mutations authored by that token can suppress the `synchronize` event needed to start ordinary pull-request workflows.

Normal human merges produce a trusted pull-request close event. Documentation automation can merge with `GITHUB_TOKEN`, for which recursive close/push workflows may be suppressed; completion of the trusted documentation workflow remains available as a recovery trigger. Reconciliation must tolerate duplicate triggers and concurrent merges without overwriting a contributor's newer head.

## Goals / Non-Goals

**Goals:**
- Refresh every stale open, non-draft, same-repository pull request targeting `develop` after the target advances.
- Cause the existing `synchronize`-driven CI and OpenSpec finalization workflows to run naturally for each refreshed head.
- Preserve exact-head concurrency, strict branch protection, and per-pull-request diagnostics.
- Make repeated or overlapping reconciliation idempotent.

**Non-Goals:**
- Merge pull requests, enable auto-merge, bypass checks, approve reviews, or change merge policy.
- Refresh drafts, fork branches, another base branch, closed pull requests, or conflicting branches.
- Execute code, dependencies, hooks, or configuration from a pull-request head with write authority.
- Synthesize check results or manually dispatch CI as a substitute for a real `synchronize` event.

## Decisions

### 1. Add one default-branch-trusted refresh workflow

A dedicated workflow will run after merged pull-request close events into `develop` and after completion of `Documentation auto-merge`. The ordinary close path will require the source pull request to be merged. The documentation completion path may run when no merge occurred; reconciliation is idempotent and will perform no mutation when every eligible branch already contains current `develop`.

The workflow will check out only the repository default branch with persisted credentials disabled. Global non-cancelling concurrency will serialize target-advance scans so two merges converge on the latest base rather than cancelling a partially completed refresh pass.

A `push`-only trigger was rejected because a documentation merge authored with `GITHUB_TOKEN` may suppress recursive workflow events. Adding refresh logic directly to every integration owner was rejected because it would duplicate policy and make future merge paths easy to omit.

### 2. Use an event-producing App token with bounded authority

The workflow will mint a short-lived token from the existing repository App credentials with only the contents and pull-request permissions needed by GitHub's update-branch API. The token will be passed only to reviewed default-branch policy. A successful App-authored update emits the ordinary `synchronize` event, allowing current workflows to perform their existing readiness, finalization, impact selection, and exact-head validation.

Using `GITHUB_TOKEN` for the update was rejected because a successful branch mutation without downstream CI would recreate the manual problem invisibly. Direct Git pushes were rejected because GitHub's update operation already provides merge/conflict semantics and expected-head protection.

### 3. Classify and mutate each candidate against fresh identity

The reconciler will page through open pull requests targeting `develop`, then freshly read each candidate and the current target before mutation. Eligibility requires an open, non-draft pull request whose base and head repositories are the governed repository and whose base ref is `develop`. It will determine whether the current target is already contained by the head and avoid a mutation when it is current.

For a stale candidate, the update request will include the exact head SHA just observed. If a contributor, finalizer, or another refresh changes the head first, expected-head enforcement prevents the stale decision from updating a different head. The next event or reconciliation pass can evaluate the new identity.

Drafts and forks are reported as skipped. Already-current or concurrently changed heads are reported as unchanged/deferred. Merge conflicts are reported as blocked for manual repair without preventing independent candidates from being considered. Authentication, permission, transport, malformed-response, pagination, or other unexpected failures remain visible and fail the workflow after bounded per-candidate reporting.

### 4. Let existing workflows own all post-refresh behavior

The refresher will not dispatch `ci.yml`, invoke finalization directly, or infer that validation passed. A successful update only creates a new branch head. Existing `synchronize` handlers then cancel stale validation where applicable, re-finalize version-3 candidates, and validate the resulting exact head. Documentation automation continues to own documentation-only integration; implementation-bound pull requests remain manual-merge-only.

## Risks / Trade-offs

- [A documentation workflow completion did not merge anything] -> The idempotent scan performs no writes for current branches and reports that outcome.
- [Two target advances occur close together] -> Serialize scans, re-read the current base per candidate, and let a later pass incorporate any newer target.
- [A contributor or finalizer pushes during reconciliation] -> Bind update to the freshly read expected head and defer on identity mismatch.
- [One pull request conflicts with `develop`] -> Report that candidate as blocked and continue considering unrelated candidates; never resolve conflicts automatically.
- [The App credential is missing or lacks update permission] -> Fail visibly without falling back to a token whose events cannot start CI.
- [Refreshing many branches starts substantial CI] -> Limit selection to open non-draft same-repository pull requests targeting `develop`; this is the exact set that branch protection requires to revalidate after the base changes.

## Migration Plan

1. Add the tested candidate classifier and GitHub update executor with expected-head, pagination, idempotency, and bounded failure behavior.
2. Add the trusted serialized workflow and event-producing App-token setup for ordinary and documentation-authored merges.
3. Update the declarative workflow inventory and governance checks to recognize the new trigger, permissions, trusted source, and branch-refresh authority.
4. Observe one merge with multiple ready pull requests and verify each non-conflicting stale branch receives a new head and ordinary CI starts, while draft/conflicting controls remain unchanged.

Rollback disables/removes the refresh workflow and helper. Existing pull requests remain intact and can again use GitHub's manual **Update branch** action.
