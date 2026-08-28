## Why

The current delivery rule treats a behavior-preserving refactor like documentation: it may be armed for auto-merge when CI is green. It also does not require a specification request and its implementation to use separate pull requests. As a result, a specification and substantial code refactor can land together before the maintainer has validated the code locally.

A specification is an approval boundary, not approval of an implementation that happens to accompany it. Code must remain available for local maintainer validation even when automated tests prove that no behavior was intended to change.

## What Changes

- A request to prepare, write, design, or update a specification creates an OpenSpec-only pull request.
- Implementation starts only after that specification pull request merges and the user explicitly requests implementation.
- Implementation uses a fresh branch and worktree from updated `origin/develop`, and a separate pull request that cites the accepted OpenSpec change.
- Auto-merge eligibility becomes path-based: every changed path must be under `openspec/**` or be the root `README.md`.
- Any other changed path makes the pull request a code/operational change, including behavior-preserving refactors and mixed spec-plus-code pull requests.
- Code/operational pull requests remain open for the maintainer's local validation and merge manually only after explicit acceptance.
- CI remains required, but a green check no longer substitutes for local maintainer acceptance of code.

## Capabilities

### Added Capabilities

- `change-delivery-workflow`: defines the specification approval boundary, separate implementation stream, exact auto-merge eligibility, and manual code acceptance.

## Impact

- Updates OpenSpec agent context and the pending `require-ci-followthrough` policy so a new session receives the workflow before planning work.
- Requires a later implementation pull request to add repository-level guidance and an enforceable auto-merge path guard.
- Does not change product runtime behavior.
