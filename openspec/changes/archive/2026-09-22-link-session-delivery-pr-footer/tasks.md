## 1. Add explicit session repository context

- [x] 1.1 Add a versioned, bounded A1-owned association store keyed by stable Pi session identity; verify atomic set/clear/read, canonical path and session-file identity, same-repository Git common-directory/worktree validation, detached/foreign/reused/deleted-path refusal, malformed-record fallback, and independent concurrent sessions.
- [x] 1.2 Add a lightweight session-context CLI set/clear operation and narrowly expose current session identity to local shell execution; verify calls outside an active session fail explicitly, no credentials/control tokens are exposed, and the operation performs no Git, PR, cwd, or cleanup mutation.
- [x] 1.3 Update delivery worktree setup guidance to set the owning session's context immediately after worktree creation; verify the documented command is copy-pasteable, leaves cleanup ownership separate, and concurrent deliveries do not overwrite each other's records.

## 2. Resolve PR metadata from the associated context

- [x] 2.1 Refactor repository metadata discovery to resolve associated-or-startup cwd, reread branch, and probe the exact open PR through bounded non-shell Git/GitHub calls; preserve canonical URL, open-state, and exact-head validation plus silent fallback for unavailable or invalid dependencies.
- [x] 2.2 Integrate immediate and serialized refresh across startup, context changes, session replacement/resume, branch/PR changes, and disposal; verify no overlapping children, unchanged state emits no redundant view, stale/late results cannot cross session generations, and every timer/process is released.
- [x] 2.3 Verify two sessions launched from the same primary `develop` checkout can associate with different worktrees and render their own PRs, while an unassociated session continues to probe only its startup context and never guesses from other worktrees.

## 3. Preserve the PR badge under path pressure

- [x] 3.1 Allocate the bare footer's first row so a complete valid `PR #<number>` badge is reserved before truncating associated worktree path/branch text and fitting the optional session suffix; verify ordinary no-PR output remains unchanged.
- [x] 3.2 Verify narrow-row boundaries preserve width, close OSC 8 and SGR state, link/style only `#<number>`, and never leak into ellipsis/session/adjacent rows; retain byte-for-byte pinned `a1 pi` output.

## 4. Validate and hand off

- [x] 4.1 Run focused association-store/CLI, repository resolver/lifecycle, owned-contract/adapter, footer rendering/hyperlink, session replacement, and delivery-guidance tests; complete build, typecheck, strict OpenSpec, architecture, packaging, and source-ledger governance required by touched boundaries.
- [x] 4.2 Build the exact candidate and provide a Windows Terminal handoff showing sessions started in the primary checkout display distinct PRs after association, retain links after resume, clear/fallback safely, preserve the badge in a narrow pane, and leave `a1 pi` unchanged.
