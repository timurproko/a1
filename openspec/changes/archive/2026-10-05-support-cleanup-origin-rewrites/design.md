# Design

## Context

`discoverRepository()` currently calls `git remote get-url origin` and accepts only explicit `github.com` HTTPS or SSH forms. Git applies `url.<replacement>.insteadOf` rules before returning that value. On this machine, the repository-local origin is the supported literal `git@github.com:timurproko/a1.git`, while a global rule rewrites it to `git@github-timurproko:timurproko/a1.git` so SSH selects the account-specific key. Cleanup sees the rewritten transport spelling, cannot prove that the alias is GitHub, and blocks before evaluating any candidate.

## Goals

- Accept a canonical repository-local GitHub origin even when Git rewrites its transport URL through `insteadOf`.
- Keep account-specific SSH routing effective for actual Git network operations.
- Preserve fail-closed repository identity and every destructive-operation safeguard.

## Non-goals

- Parsing `~/.ssh/config` or trusting arbitrary SSH aliases as GitHub.
- Supporting non-GitHub repository hosts.
- Changing cleanup evidence, ownership, content, ancestry, or remote-ref gates.
- Bypassing the existing blocker with per-command environment overrides.

## Decisions

### Separate configured identity from effective transport

Repository discovery will read the literal repository-local `remote.origin.url` through `git config --local`, require exactly one nonempty value, and parse only the existing supported `https://github.com/owner/repository[.git]` and `git@github.com:owner/repository[.git]` forms. That literal provides the GitHub API `owner/repository` identity.

Cleanup will retain `origin` as the Git remote used by fetch/ref operations. Git may rewrite that remote internally for transport and credential routing; the rewrite is not treated as repository identity and does not need to be interpreted by cleanup.

### Keep aliases fail closed

A literal origin that itself names `github-work`, another SSH alias, or another host remains `unsupported-origin`, even if local SSH configuration would route it to GitHub. Cleanup will not execute `ssh -G`, parse user SSH files, or infer trust from successful connectivity. Multiple or empty repository-local origin URL values also block as ambiguous.

### Exercise the real Git rewrite behavior

The dependency-free local-cleanup fixture will configure a canonical GitHub origin and a repository-local `url.*.insteadOf` rule, prove `git remote get-url origin` returns the alias, and verify repository discovery and cleanup still use the canonical identity. Negative fixtures will retain rejection of literal aliases and malformed or ambiguous values.

## Risks / Trade-offs

- **A configured push URL may differ from fetch identity** → Cleanup continues to bind identity to the fetch URL; existing remote mutation checks remain scoped to that same named remote and exact ref.
- **Git configuration scopes can overlap** → `--local` intentionally ignores global/system fallback for repository identity and fails when the repository itself does not declare one exact origin URL.
- **An alias may genuinely identify GitHub** → It remains unsupported unless the repository stores canonical GitHub identity; this avoids trusting mutable external SSH configuration.

## Rollback

Reverting the repository discovery read and fixtures restores the current effective-URL parsing and its `unsupported-origin` behavior. No cleanup journal, worktree, branch, or remote data format changes.
