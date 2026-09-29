## Why

When one pull request merges into `develop`, every other ready pull request becomes stale under strict branch protection. Maintainers currently have to open each pull request and select **Update branch** before current-base CI can run again.

## What Changes

- After `develop` advances through a pull-request merge, trusted automation finds every open, non-draft, same-repository pull request targeting `develop` and refreshes each stale branch.
- Use an event-producing repository App identity and GitHub's expected-head update operation so each successful refresh emits `synchronize` and starts the existing current-head CI and finalization workflows.
- Re-read pull-request and base identity before mutation, serialize refresh runs, and skip drafts, forks, already-current branches, changed heads, and merge conflicts without rewriting them.
- Report each updated, skipped, deferred, or failed candidate while preserving strict required checks, manual implementation acceptance, documentation-only integration policy, and safe branch cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `github-repository-governance`: Automatically reconcile stale ready pull-request branches after `develop` advances, using trusted least-privilege automation that retriggers ordinary CI without gaining merge authority.

## Impact

The implementation will add default-branch-trusted workflow policy, a bounded GitHub reconciliation helper with focused tests, and the corresponding declarative workflow inventory/specification updates. It will reuse the existing repository App credentials only for same-repository branch refreshes; it will not execute pull-request code with write credentials, update draft or fork branches, dispatch replacement checks, enable auto-merge, or merge implementation pull requests.
