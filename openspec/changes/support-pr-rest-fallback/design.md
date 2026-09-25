## Context

`readPullRequest` currently invokes `gh pr view` in the selected repository context and treats every command failure as absent metadata. This preserves startup reliability, but it also makes the footer badge depend on an optional executable. The selected cwd and exact branch are already known, and `git remote get-url origin` can identify a GitHub repository without changing repository state.

GitHub's pull-request list endpoint supports an exact `owner:branch` head filter. Public repositories can be read without authentication; private repositories require a caller-provided token. The fallback must remain background metadata rather than a startup or session dependency.

## Goals / Non-Goals

**Goals:**
- Discover the same normalized open-or-merged PR when `gh` is missing or does not return an eligible result.
- Keep requests bounded, cancellable, read-only, and silent on failure.
- Validate local remote identity and every remote response before exposing a hyperlink.
- Support public repositories without credentials and private repositories when a standard GitHub token is already present in the process environment.

**Non-Goals:**
- Replace `gh` as the preferred probe or remove its behavior.
- Add credential storage, interactive authentication, GitHub Enterprise support, pagination, or a general GitHub client.
- Search arbitrary remotes, worktrees, repositories, or similarly named branches.
- Change footer presentation, refresh cadence, or comparison-profile output.

## Decisions

### 1. Retain `gh` first and use REST only as a fallback

Run the existing non-shell `gh pr view` probe first. If it yields a valid exact-branch open-or-merged identity, return it without a network fallback. Otherwise read the selected worktree's `origin` URL and attempt the REST path.

This preserves existing authenticated/private-repository behavior and avoids an extra API request for environments where `gh` already works. A failed fallback still resolves to silent absence.

### 2. Derive one bounded GitHub repository identity from `origin`

Read `remote.origin.url` through a bounded non-shell Git command. Accept canonical GitHub HTTPS and SSH/SCP-style forms, remove only one optional `.git` suffix, and require exactly an owner and repository segment. Reject credentials, ports outside accepted syntax, extra path segments, non-GitHub hosts, and malformed values.

Use the parsed owner as the REST `head` owner and the already validated selected branch as the head ref. Do not scan other remotes or guess fork ownership.

### 3. Query GitHub's read API with strict validation

Issue one `GET /repos/{owner}/{repo}/pulls?state=all&head={owner}:{branch}&per_page=100` request against `api.github.com`. Send GitHub's JSON accept header, an explicit A1 user agent, and `Authorization: Bearer` only when `GH_TOKEN` or `GITHUB_TOKEN` is present. Never log, return, persist, or include the token in a URL.

Accept only a unique exact-head candidate whose state is open or whose closed state has a non-null merge timestamp. Normalize only a positive integer number and a canonical `https://github.com/<owner>/<repo>/pull/<number>` URL. Reject ambiguous, closed-unmerged, malformed, mismatched, redirected-to-unexpected-origin, oversized, non-success, rate-limited, or timed-out responses.

### 4. Share lifecycle cancellation and silent failure semantics

Use the existing probe abort signal plus a short request deadline. Abort remote lookup when the runtime refresh is cancelled or disposed. All Git and HTTP failures return `null`; they do not block startup, emit a user-facing diagnostic, or alter refresh scheduling.

## Risks / Trade-offs

- **[Unauthenticated rate limits hide the badge]** -> Prefer `gh`, use only one fallback request per existing refresh window, honor optional standard tokens, and fail silently.
- **[Fork PRs may use a different head owner]** -> Deliberately query only the selected repository's parsed origin owner; avoiding remote scans prevents incorrect cross-repository association. Fork-specific discovery remains out of scope.
- **[A crafted remote or API payload produces an unsafe link]** -> Strictly parse GitHub remotes and validate canonical GitHub PR URLs, exact head refs, state, and repository identity.
- **[Network work survives disposal]** -> Compose the runtime signal with a request timeout and ignore aborted or late results under the existing generation checks.
- **[Private repository credentials leak]** -> Read standard token variables only for the Authorization header and never expose them through diagnostics, URLs, return values, or tests.

## Migration Plan

No migration is required. Add the fallback behind the existing probe contract and polling lifecycle. Rollback removes the remote/API fallback while leaving `gh` discovery and footer data unchanged.
