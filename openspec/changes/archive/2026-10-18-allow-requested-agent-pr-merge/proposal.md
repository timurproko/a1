## Why

A maintainer can ask an agent to implement and prepare a pull request, but current repository policy forbids that same agent from performing the final protected merge even after the exact candidate is mergeable. Allowing an explicit, head-bound merge request removes that unnecessary handoff while retaining CI, branch protection, and maintainer acceptance.

## What Changes

- Let an authorized maintainer explicitly instruct the active agent to squash-merge one identified, currently mergeable pull-request head.
- Require the agent to refresh pull-request state immediately before merging and verify the exact head, current base, finalized delivery binding, successful required validation, positive mergeability, and an authorized human GitHub credential.
- Use an expected-head protected merge without administrative bypass, auto-merge, merge queue, waiting, or standing authorization; any candidate change requires a fresh request.
- Treat the maintainer's exact merge instruction as acceptance of the finalized plain acceptance list, while retaining existing post-merge provenance, archive verification, branch cleanup, and refusal behavior.
- Keep Apps, bots, repository workflows, unattended agents, and independently credentialed automation unable to authorize implementation integration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Permit an agent to execute a protected exact-head merge only after an authorized maintainer explicitly requests it for a currently mergeable candidate.
- `github-repository-governance`: Define the identity, current-head, validation, mergeability, and no-bypass safeguards for maintainer-delegated agent merges.
- `openspec-acceptance-review`: Recognize an exact-candidate merge instruction as the maintainer's acceptance decision while retaining immutable GitHub verification of the resulting direct merge.

## Impact

The change affects root agent instructions, the first-party delivery skill, OpenSpec delivery guidance, canonical delivery and acceptance policy, and focused governance tests. It changes no branch protection, required checks, merge method, documentation automation, merge queue prohibition, GitHub App permissions, or product runtime behavior. This bootstrap policy PR remains subject to the currently deployed maintainer-only integration rule.
