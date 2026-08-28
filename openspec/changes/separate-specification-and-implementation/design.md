## Context

The repository currently combines three independent decisions:

1. whether CI has validated a pull request,
2. whether a maintainer has accepted code by running it locally, and
3. whether a specification has been accepted before implementation begins.

The old rule allowed specifications, documentation, and behavior-preserving refactors to auto-merge. That made intent rather than changed paths determine whether the maintainer retained a local acceptance window. It also allowed one branch to contain both the approval document and the implementation being approved.

## Goals / Non-Goals

**Goals:**

- Make specification acceptance and implementation acceptance separate, observable pull-request boundaries.
- Give new agent sessions an exact rule before they create a branch or arm auto-merge.
- Classify auto-merge eligibility using changed paths rather than claims about visibility or behavior preservation.
- Preserve CI as a required automated gate while reserving code merge approval for the maintainer after local validation.

**Non-Goals:**

- Define which local scenarios the maintainer must run for each feature.
- Require full automated test suites on a workstation.
- Change release validation or product behavior.
- Automatically begin implementation when a specification merges.

## Decisions

### Decision: specification work is its own delivery stream

A request to prepare, write, design, or update a specification produces a pull request whose changed paths are only under `openspec/**`. Source code, tests, scripts, workflows, configuration outside OpenSpec, generated baselines, and implementation documentation are deferred.

Implementation begins only after the specification pull request is merged and the user explicitly requests implementation. The implementation starts from refreshed `origin/develop` in a new worktree and branch; it does not continue from or stack on the specification branch.

This makes merging the specification approval of the contract and plan, not implicit approval of code.

### Decision: auto-merge eligibility is an exact path allowlist

A pull request may be integrated automatically only when every changed path is either under `openspec/**` or exactly `README.md` at the repository root. Any path outside that allowlist classifies the entire pull request as code/operational, even if the implementation is called a refactor or behavior-preserving.

The trusted guard arms eligible pull requests while validation is pending, with protected `develop` retaining authority to block integration. A reconciliation run may directly squash-merge an already-clean pull request only when successful validation names its current head and the merge operation enforces that expected SHA. This removes a GitHub clean-state race without letting stale validation authorize a changed head.

A mixed pull request does not inherit eligibility from its specification files. It must be split before review or follow the manual code path.

### Decision: all code waits for local acceptance and a manual merge

A code/operational pull request remains open after CI succeeds. The agent provides the applicable local run instructions and does not invoke `gh pr merge --auto`. After the maintainer reports local acceptance and explicitly authorizes integration, the pull request may be merged manually.

CI and local acceptance answer different questions: CI proves automated contracts; local acceptance confirms the delivered interaction or operation is acceptable to the maintainer.

### Decision: enforcement follows in the implementation stream

The specification stream records the policy in OpenSpec context so new sessions can follow it immediately. A later, separate implementation pull request adds durable repository guidance and a GitHub guard that rejects or disables auto-merge when changed paths fall outside the allowlist.

The guard must classify the complete pull-request diff, fail closed on classification errors, and preserve manual merging after required CI and explicit maintainer acceptance.

## Risks / Trade-offs

- **Agents may ignore prose policy** → add repository-level automated enforcement in the separate implementation stream.
- **Path-based classification is stricter than intent** → this is deliberate; code never bypasses local acceptance because it claims to preserve behavior.
- **A specification may need adjacent documentation** → keep the specification PR under `openspec/**`; make unrelated documentation a separate change rather than weakening the boundary.
- **Two pull requests add latency** → the explicit approval boundary is more valuable than combining planning and implementation for speed.

## Migration Plan

1. Merge this OpenSpec-only pull request using the allowed specification auto-merge path.
2. Start a fresh implementation stream from the resulting `origin/develop` only after an explicit implementation request.
3. Add repository agent guidance, path classification tests, and an auto-merge guard in the code/operational pull request.
4. Leave that implementation pull request open for local validation and explicit manual merge.
5. Prove the corrected guard with separate OpenSpec-only and root-`README.md`-only live acceptance pull requests before archiving this change.

## Open Questions

None.
