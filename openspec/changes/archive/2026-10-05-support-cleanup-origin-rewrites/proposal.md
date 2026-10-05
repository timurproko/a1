## Why

Local cleanup derives the GitHub repository identity from `git remote get-url origin`. Git applies global `url.*.insteadOf` rewriting to that command, so a canonical `git@github.com:owner/repository.git` origin can appear as an account-specific SSH host alias and fail with `unsupported-origin`. This currently prevents the verified merged `align-progress-accent` worktree from being cleaned even though `.git/config` contains a supported GitHub URL.

## What Changes

- Derive cleanup's GitHub API identity from the literal repository-local `remote.origin.url` value rather than Git's transport-rewritten effective URL.
- Keep actual fetch, ref, and push operations on Git's normal effective origin so SSH account aliases continue selecting the intended credentials.
- Preserve fail-closed rejection for origins whose literal repository configuration does not identify `github.com` over supported HTTPS or SSH syntax.
- Add focused repository fixtures for canonical origins rewritten through `url.*.insteadOf`, plus unsupported literal aliases and ambiguous origin configuration.
- Clarify cleanup documentation for Git URL rewriting and account-specific SSH aliases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Repository discovery remains bound to a canonical GitHub origin while tolerating transport-only Git URL rewrites.

## Impact

- Affects repository discovery in `scripts/governance/local-cleanup-git.mjs`, dependency-free cleanup fixtures, and `docs/local-worktree-cleanup.md`.
- Does not broaden accepted repository hosts, trust SSH configuration as repository identity, weaken exact PR/ref/ancestry/content checks, or change remote deletion authority.
