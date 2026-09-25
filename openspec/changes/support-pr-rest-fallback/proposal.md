## Why

The bare-A1 footer currently depends exclusively on GitHub CLI to discover a branch's pull request. When `gh` is not installed, an otherwise reachable GitHub pull request silently disappears from the linked worktree status even though ordinary Git repository metadata and GitHub's read API are sufficient for discovery.

## What Changes

- Keep the existing bounded `gh pr view` probe as the preferred discovery path.
- When that probe is unavailable or yields no eligible pull request, derive the selected GitHub repository from its configured remote and query the GitHub REST API for the exact head branch.
- Support unauthenticated reads for public repositories and optional `GH_TOKEN`/`GITHUB_TOKEN` authentication for private repositories without persisting credentials.
- Apply the existing exact-branch, open-or-merged state, canonical URL, timeout, cancellation, and silent-failure constraints to REST results.
- Cover GitHub remote parsing, REST response validation, fallback ordering, authentication headers, and failure behavior with focused tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Pull-request footer discovery remains available through a bounded GitHub REST fallback when GitHub CLI is absent or cannot resolve the selected branch.

## Impact

Implementation is expected to affect the repository PR probe, a lazily loaded REST collaborator, the reviewed startup-graph baseline that declares that collaborator optional, and focused tests. It will not change footer rendering, polling cadence, stored settings, Git/GitHub state, or the pinned `a1 pi` profile.

This change contains planning artifacts only, not implementation.
