## Why

Guarded cleanup cannot currently discard a closed-unmerged PR's local and remote branches after its checkout disappeared without a registration. It also correctly blocks external descendant links, but offers no explicit link-only remediation for an ignored disposable link such as `.artifacts/agent/shared-node-modules` pointing to the primary repository's dependencies.

## What Changes

- Extend the existing explicitly confirmed `discard` operation with a mutually exclusive exact branch selector for candidates without a checkout; retain closed-unmerged PR binding, protected/ref safety, ownership exclusion, and expected-head deletion.
- Add an explicitly confirmed, exact-candidate link-only remediation command that removes one named ignored symlink or junction beneath a central disposable root without traversing or changing its target.
- Keep automatic sweep, ordinary worktree purge, and default external-descendant-link refusal unchanged. Do not treat closed PRs as merged or archive rejected work.
- Document both operations and cover their identity, drift, concurrency, retry, and refusal boundaries with focused dependency-free cleanup tests.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `local-worktree-cleanup`: Add guarded branch-only discard and explicit disposable-link remediation.

## Impact

- Local cleanup CLI, branch/worktree identity helpers, evidence reuse, mutation-scoped state/journaling, and cleanup tests.
- `docs/local-worktree-cleanup.md` and directly affected delivery guidance.
- No product runtime, release, dependency, GitHub protection, or automated integration changes.
- Actual repository cleanup remains a separately invoked operation after delivery; planning and implementation do not authorize deleting additional candidates.
