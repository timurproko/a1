## Context

Bare A1 resolves an optional session-associated worktree and polls its branch locally every five seconds. It probes GitHub at a minute-scale cadence, or immediately when the selected worktree or branch changes. The GitHub command already returns the pull request for a merged branch, but `parseOpenPullRequest` accepts only `state === "OPEN"`. The next remote refresh therefore converts the same PR identity to `null` and the runtime emits a footer view without the badge.

A live probe in the retained worktree for merged PR #552 returned the same exact `headRefName`, number, and canonical URL with `state: "MERGED"`. The worktree and branch association had not changed. Existing runtime logic already re-probes immediately when either context value changes and replaces or clears the old identity from that result.

## Goals / Non-Goals

**Goals:**
- Preserve the linked PR number and URL when an exact branch-associated PR transitions from open to merged.
- Restore that merged PR link when the same stable session resumes with the same valid associated worktree.
- Remove or replace the old link when the selected worktree or branch changes and no longer resolves that PR.
- Preserve bounded, silent, lifecycle-owned GitHub discovery and current canonical URL validation.

**Non-Goals:**
- Display pull-request state, checks, title, review status, or merge metadata.
- Keep closed-unmerged pull requests visible.
- Persist a PR number separately from repository-context discovery.
- Change association storage, cleanup authority, footer layout, or the `a1 pi` comparison profile.

## Decisions

### 1. Broaden exact branch discovery from open to open-or-merged

Rename the discovery/parser terminology from “open pull request” to “branch pull request” and accept only GitHub states `OPEN` and `MERGED`. Keep all existing positive-number, canonical HTTPS GitHub URL, URL-number, and exact `headRefName` checks.

The normalized footer identity remains only `{ number, url }`. A transition from open to merged therefore produces the same normalized identity and no redundant view update; the existing badge simply remains present. A session starting or resuming after merge can independently recover the same identity from `gh pr view`.

`CLOSED` remains invalid. A rejected or abandoned pull request should not become a persistent footer association merely because its historical head branch name still matches.

Alternatives rejected:
- Cache the last open PR without accepting merged responses. That would not restore the link after restart and could preserve stale data through a genuine repository-context change.
- Add state to the footer model. The requested UI is still only a PR link, and rendering state would introduce unrelated presentation scope.
- Accept every GitHub state. This would retain closed-unmerged delivery links contrary to the existing safe no-badge behavior.

### 2. Keep repository context as the invalidation boundary

Retain the runtime's current context polling and remote cadence. A changed associated cwd or branch forces an immediate probe rather than waiting for the minute-scale refresh. The probe result is still resolved in the newly selected cwd and must report that exact branch, so a missing or mismatched result clears the old identity and a different matching PR replaces it.

No PR identity is persisted in the session-context record. The record continues to identify only the validated worktree, and GitHub remains the source for the PR relation on startup, resume, and refresh.

### 3. Prove state continuity and context invalidation separately

Focused parser tests shall establish that identical open and merged payloads normalize to the same identity while closed-unmerged and mismatched results remain invalid. Runtime coverage shall establish that changing repository cwd or branch cannot carry the previous badge into an unrelated context, including when the new context has no matching PR.

The canonical specification shall describe an “open or merged” branch-associated PR and add explicit post-merge cleanup and resume scenarios. Existing optional-failure behavior remains unchanged: unavailable GitHub tooling, authentication, malformed output, timeout, or no matching PR produces no badge and does not fail the session.

## Risks / Trade-offs

- **[A merged branch name is later reused]** -> Repository-context changes trigger a fresh exact-branch probe; no PR identity is persisted or copied into the new context. Closed-unmerged results remain rejected.
- **[`gh pr view` changes merged-branch behavior]** -> Missing or invalid output continues to fail safely to no badge; focused parsing tests bind only supported normalized output.
- **[A state-only refresh causes unnecessary redraw]** -> Keep state out of the normalized identity so `OPEN` and `MERGED` for the same number/URL compare equal.
- **[Terminology remains misleading]** -> Rename internal discovery helpers and update specification language without changing the public footer model.

## Migration Plan

1. Update branch PR discovery and parser terminology to accept exact open or merged results.
2. Add focused parser and runtime coverage for merge continuity, resume-compatible discovery, and context-change invalidation.
3. Validate the modified OpenSpec capability and focused TypeScript tests.

Rollback restores open-only parsing. No persisted records or user configuration require migration.
