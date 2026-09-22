## Context

The footer currently formats `path (branch) • session-name` from `OwnedUiFooterView`. `PiEngineRuntime` reads the branch once during startup, and `SessionFooter` owns width-aware path and footer rendering. Bare A1 uses the `a1` footer profile, while `a1 pi` uses the pinned `pi` profile.

A1 already emits OSC 8 hyperlinks and uses the `mdLink` theme role for web links. Supported terminals own their native idle, hover, and Ctrl+click behavior. Claude Code's analogous badge uses an explicit PR URL rather than relying on terminal URL detection; the same principle applies here.

The planning base is `535caf53`. The requested examples use both `PR564` and `PR567`; the design treats the number as dynamic and standardizes the visible form as `PR<number>` without a `#`, matching the supplied status-bar shape.

## Goals / Non-Goals

**Goals:**
- Show the current branch's open PR directly after the path and branch in bare A1.
- Make only the PR label a bounded terminal-native hyperlink with the existing web-link color.
- Keep startup and the running session usable when GitHub CLI, authentication, network access, repository metadata, or a matching open PR is unavailable.
- Refresh stale PR identity without overlapping probes or leaking timers/processes.
- Preserve footer width limits, ordinary path/branch/session formatting, and pinned comparison behavior.

**Non-Goals:**
- Show review state, checks, draft state, mergeability, title, or author.
- Create, edit, open in-process, or otherwise mutate a pull request.
- Add a GitHub API client, token store, setting, command, or custom mouse handler.
- Add the badge to `a1 pi` or change terminal-native link activation semantics.

## Decisions

### 1. Probe the current branch through `gh` and fail closed

After the runtime knows its effective cwd and branch, a repository metadata collaborator will execute a bounded, non-shell `gh pr view --json number,url,state,headRefName` probe in that cwd. It will accept only a positive integer number, an HTTPS GitHub URL, `OPEN` state, and a head branch equal to the branch already read by A1. Malformed output, mismatched or closed PRs, detached heads, missing `gh`, authentication/network failures, nonzero exits, and timeout all produce no PR and no user-facing error.

The probe will not delay runtime startup. It will publish a view update only when the normalized PR identity changes.

Alternative rejected: derive the URL from `git remote` and a guessed number. The branch-to-PR association and canonical URL belong to GitHub and guessing can produce a clickable but incorrect destination.

### 2. Refresh serially and dispose completely

Run one immediate background probe, then refresh no more than once per 60 seconds while the runtime is alive. Only one child process may be active; a slow probe cannot accumulate another. Disposal clears the timer, aborts/kills an active probe through the bounded execution primitive, and ignores late completion. Repeated absence remains silent and does not churn the view revision.

Alternative rejected: probe only once at startup. A session commonly remains open while a PR is created or closed, which would leave the footer stale. Polling faster than one minute would add process overhead without meaningful UX benefit.

### 3. Extend the owned footer contract with normalized optional identity

Add an optional nullable pull-request object containing only `number` and `url` to `OwnedUiFooterView`. The adapter copies the runtime's normalized value into snapshots. Contract validation will reject invalid numbers, unsafe URLs, and partial objects so terminal control data cannot enter rendering through this field.

The field remains vendor-neutral in shape even though the initial producer uses GitHub CLI. No review state or CLI diagnostics cross the engine boundary.

Alternative rejected: inject an already styled badge into `extensionStatuses`. That loses semantic identity, puts the badge on the wrong row, bypasses contract validation, and makes placement dependent on extension ordering.

### 4. Render a bare-A1-only OSC 8 badge in the path row

For the `a1` profile, append ` PR<number>` after `path (branch)` and before the existing ` • session-name` suffix. Wrap only `PR<number>` with Pi TUI's hyperlink primitive and color its text with the established `mdLink` role. The path, branch, spaces, and session name remain dim and unlinked. The `pi` profile ignores the PR field, preserving the pinned footer.

Keep the current ANSI-aware `truncateToWidth` path-row limit. A narrow terminal may truncate the tail, including some or all of the badge; truncation must close OSC 8 and SGR state and never leak the link onto adjacent cells or rows.

Alternative rejected: print the raw URL. It consumes footer width and does not meet the requested compact identifier. A custom click region is also unnecessary because OSC 8 already gives regular mode to the terminal and takes precedence in fullscreen mode.

## Risks / Trade-offs

- **[`gh` can be slow or unavailable]** -> Run asynchronously with a hard timeout, no overlapping probes, and silent absence.
- **[A stale or ambiguous association opens the wrong PR]** -> Require open state and exact head-branch agreement; periodically refresh and clear changed/closed results.
- **[Terminal escapes leak after truncation]** -> Use the existing hyperlink primitive and ANSI-aware truncation; test visible width, target boundaries, and following text.
- **[Polling outlives a session]** -> Own timer/process cancellation in the runtime lifecycle and ignore late results by generation/disposal state.
- **[Pinned parity changes]** -> Gate rendering on the existing `a1` profile and assert byte-for-byte unchanged `pi` footer output.

## Migration Plan

No data migration is required. Add the optional contract field, repository probe, lifecycle refresh, and renderer in one implementation. Rollback removes the optional producer and bare-A1 rendering while leaving existing footer data and session files compatible.
