## MODIFIED Requirements

### Requirement: Bare A1 links the session-associated worktree's open pull request from the footer

Bare A1 SHALL support one explicit optional repository-context association per stable Pi session. When a valid association exists, A1 SHALL discover the branch and open GitHub pull request from that associated worktree even when the session started in another checkout; otherwise it SHALL use the session's effective startup working tree and SHALL NOT guess among other worktrees. The association SHALL be scoped by stable session identity, SHALL survive restart or resume of that same session, SHALL reload on session replacement, and SHALL NOT be inherited by an unrelated or forked session without an explicit association.

The association operation SHALL validate active session identity, canonical worktree identity, non-detached branch state, and same Git common-directory identity as the session's startup repository. It SHALL change only repository metadata discovery and SHALL NOT change tool cwd, session cwd, Git state, GitHub state, worktree cleanup registration, or cleanup authority. Missing, malformed, foreign, detached, deleted, reused, or otherwise invalid associations SHALL fail closed to the startup repository context without making A1 startup or the running session fail.

When the selected repository context has an open pull request, bare A1 SHALL render `PR #<number>` directly after the footer's path and branch. The `PR` prefix SHALL retain the footer's grey, while only `#<number>` SHALL use the established web-link color and carry the pull request's canonical HTTPS URL as a terminal-native hyperlink. The path, branch, `PR` prefix, separator, ellipsis, and session name SHALL remain outside the hyperlink. Width allocation SHALL preserve a complete valid PR badge at ordinary constrained widths by truncating path/branch text first; widths too small for the complete badge SHALL truncate safely without leaking hyperlink or foreground state.

Discovery SHALL reread associated context and branch, and SHALL remain asynchronous, bounded, serialized, optional, and lifecycle-owned. Missing GitHub CLI or authentication, no open PR, mismatched branch, malformed or unsafe output, command failure, and timeout SHALL leave the footer without a badge and SHALL NOT block startup or fail the session. Association, branch, and PR changes SHALL refresh while the session runs, unchanged observations SHALL NOT emit redundant views, and disposal SHALL release timers and active work.

The badge and association are declared bare-A1 behavior. The `a1 pi` comparison profile SHALL retain its pinned footer bytes and SHALL NOT render the badge or consume the association.

#### Scenario: Link a delivery worktree created after session startup

- **GIVEN** a bare-A1 session started in a primary checkout on `develop`
- **AND** the session explicitly associates its newly created same-repository worktree on branch `fix/example`
- **AND** that branch has open pull request 567 at `https://github.com/example/project/pull/567`
- **WHEN** repository metadata refresh completes
- **THEN** the footer SHALL contain `PR #567` for the associated worktree
- **AND** discovery SHALL NOT continue using the primary checkout's `develop` branch
- **AND** the session and tool cwd SHALL remain the primary checkout

#### Scenario: Keep concurrent sessions independent

- **GIVEN** two sessions started from the same primary checkout
- **AND** each session associates a different valid worktree with a different open pull request
- **WHEN** both footers refresh
- **THEN** each footer SHALL show only its own associated pull request
- **AND** neither session SHALL select a worktree by recency, name, scanning, or another session's record

#### Scenario: Restore association after resume

- **GIVEN** a session has a valid associated worktree
- **WHEN** that same stable session is restarted or resumed
- **THEN** A1 SHALL revalidate and restore its repository context
- **AND** SHALL refresh the associated branch and open pull request without requiring another association command

#### Scenario: Reject invalid or stale association

- **WHEN** an association is malformed, foreign-repository, detached, deleted, reused with changed identity, or belongs to another session
- **THEN** A1 SHALL ignore it and use the startup repository context
- **AND** SHALL NOT mutate Git, GitHub, the session, or cleanup state
- **AND** SHALL NOT fail startup or emit an unbounded diagnostic

#### Scenario: Association or branch changes during the session

- **WHEN** the session sets or clears an association, switches to another session, or the selected context's branch or open pull request changes
- **THEN** bounded serialized discovery SHALL update to the newest normalized branch and PR identity
- **AND** no two discovery processes SHALL overlap
- **AND** unchanged observations SHALL NOT cause redundant view updates
- **AND** stale results from an older association or session generation SHALL NOT render

#### Scenario: Preserve the badge in a constrained row

- **GIVEN** a valid linked pull request and path/branch text too wide for the footer row
- **WHEN** the row is wide enough for the complete PR badge but not all text
- **THEN** A1 SHALL truncate path/branch text before truncating `PR #<number>`
- **AND** only `#<number>` SHALL resolve to the canonical PR URL
- **AND** hyperlink and foreground state SHALL close within the row

#### Scenario: No explicit association exists

- **WHEN** a session has no valid explicit repository-context association
- **THEN** A1 SHALL preserve startup-working-tree discovery
- **AND** SHALL NOT scan or guess among other local worktrees or pull requests

#### Scenario: Use the pinned comparison profile

- **WHEN** the same session and footer state are rendered through `a1 pi`
- **THEN** its output SHALL match the pinned footer without a PR badge or association-specific presentation
