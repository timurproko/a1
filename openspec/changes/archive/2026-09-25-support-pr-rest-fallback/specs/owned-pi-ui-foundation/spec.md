## MODIFIED Requirements

### Requirement: Bare A1 links the current branch's open pull request from the footer

Bare A1 SHALL support one explicit optional repository-context association per stable Pi session. When a valid association exists, A1 SHALL discover the branch and its open or merged GitHub pull request from that associated worktree even when the session started in another checkout; otherwise it SHALL use the session's effective startup working tree and SHALL NOT guess among other worktrees. The association SHALL be scoped by stable session identity, SHALL survive restart or resume of that same session, SHALL reload on session replacement, and SHALL NOT be inherited by an unrelated or forked session without an explicit association.

The association operation SHALL validate active session identity, canonical worktree identity, non-detached branch state, and same Git common-directory identity as the session's startup repository. It SHALL change only repository metadata discovery and SHALL NOT change tool cwd, session cwd, Git state, GitHub state, worktree cleanup registration, or cleanup authority. Missing, malformed, foreign, detached, deleted, reused, or otherwise invalid associations SHALL fail closed to the startup repository context without making A1 startup or the running session fail.

When the selected repository context has an open or merged pull request, bare A1 SHALL render only `#<number>` directly after the footer's path and branch. The complete `#<number>` badge SHALL use the established web-link color and carry the pull request's canonical HTTPS URL as a terminal-native hyperlink. The path, branch, separator, ellipsis, and session name SHALL remain outside the hyperlink. Width allocation SHALL preserve a complete valid PR badge at ordinary constrained widths by truncating path/branch text first; widths too small for the complete badge SHALL truncate safely without leaking hyperlink or foreground state.

Discovery SHALL reread associated context and branch, and SHALL remain asynchronous, bounded, serialized, optional, and lifecycle-owned. A1 SHALL prefer bounded GitHub CLI discovery and, when it yields no eligible identity, MAY query GitHub's read-only REST API using a strictly validated GitHub `origin` repository and exact selected head branch. The REST fallback SHALL work without credentials for public repositories and MAY use a caller-provided standard GitHub environment token for private repositories without persisting or exposing it. Missing GitHub CLI or authentication, an absent or invalid GitHub remote, no open or merged PR, a closed-unmerged PR, mismatched or ambiguous results, malformed or unsafe output, rate limiting, command or request failure, and timeout SHALL leave the footer without a badge and SHALL NOT block startup or fail the session. Association, branch, and PR changes SHALL refresh while the session runs, unchanged normalized observations SHALL NOT emit redundant views, and disposal SHALL release timers and active work. A transition of the same exact PR from open to merged SHALL retain the same normalized badge identity.

The badge and association are declared bare-A1 behavior. The `a1 pi` comparison profile SHALL retain its pinned footer bytes and SHALL NOT render the badge or consume the association.

#### Scenario: Link a delivery worktree created after session startup

- **GIVEN** a bare-A1 session started in a primary checkout on `develop`
- **AND** the session explicitly associates its newly created same-repository worktree on branch `fix/example`
- **AND** that branch has open pull request 567 at `https://github.com/example/project/pull/567`
- **WHEN** repository metadata refresh completes
- **THEN** the footer SHALL contain `#567` for the associated worktree
- **AND** discovery SHALL NOT continue using the primary checkout's `develop` branch
- **AND** the session and tool cwd SHALL remain the primary checkout

#### Scenario: Keep a merged delivery link during cleanup

- **GIVEN** the selected repository context remains the same associated worktree and branch
- **AND** its exact pull request was previously open and is now merged
- **WHEN** repository metadata refresh completes during post-merge verification or cleanup
- **THEN** the footer SHALL retain the same linked `#<number>` badge
- **AND** the state-only transition SHALL NOT emit a redundant normalized footer identity

#### Scenario: Keep concurrent sessions independent

- **GIVEN** two sessions started from the same primary checkout
- **AND** each session associates a different valid worktree with a different open or merged pull request
- **WHEN** both footers refresh
- **THEN** each footer SHALL show only its own associated pull request
- **AND** neither session SHALL select a worktree by recency, name, scanning, or another session's record

#### Scenario: Restore association after resume

- **GIVEN** a session has a valid associated worktree whose exact pull request is open or merged
- **WHEN** that same stable session is restarted or resumed
- **THEN** A1 SHALL revalidate and restore its repository context
- **AND** SHALL refresh the associated branch and pull request without requiring another association command

#### Scenario: Reject invalid or stale association

- **WHEN** an association is malformed, foreign-repository, detached, deleted, reused with changed identity, or belongs to another session
- **THEN** A1 SHALL ignore it and use the startup repository context
- **AND** SHALL NOT mutate Git, GitHub, the session, or cleanup state
- **AND** SHALL NOT fail startup or emit an unbounded diagnostic

#### Scenario: Association or branch changes during the session

- **WHEN** the session sets or clears an association, switches to another session, or the selected context's branch or pull request changes
- **THEN** bounded serialized discovery SHALL update to the newest normalized branch and PR identity
- **AND** the previous PR badge SHALL be absent unless the new context independently resolves an exact open or merged PR
- **AND** no two discovery processes SHALL overlap
- **AND** unchanged observations SHALL NOT cause redundant view updates
- **AND** stale results from an older association or session generation SHALL NOT render

#### Scenario: Preserve the badge in a constrained row

- **GIVEN** a valid linked pull request and path/branch text too wide for the footer row
- **WHEN** the row is wide enough for the complete PR badge but not all text
- **THEN** A1 SHALL truncate path/branch text before truncating `#<number>`
- **AND** only `#<number>` SHALL resolve to the canonical PR URL
- **AND** hyperlink and foreground state SHALL close within the row

#### Scenario: No explicit association exists

- **WHEN** a session has no valid explicit repository-context association
- **THEN** A1 SHALL preserve startup-working-tree discovery
- **AND** SHALL NOT scan or guess among other local worktrees or pull requests

#### Scenario: Fall back to REST without GitHub CLI

- **GIVEN** the selected context has a valid GitHub `origin` and exact branch with an eligible pull request
- **AND** GitHub CLI is absent or yields no eligible identity
- **WHEN** the bounded GitHub REST fallback returns that exact open or merged pull request
- **THEN** bare A1 SHALL normalize and render the same linked `#<number>` identity
- **AND** a public-repository request SHALL require no credential
- **AND** discovery SHALL remain read-only and SHALL NOT mutate Git or GitHub

#### Scenario: Prefer successful GitHub CLI discovery

- **WHEN** bounded GitHub CLI discovery returns a valid exact-branch pull request identity
- **THEN** A1 SHALL use that identity without issuing the REST fallback request

#### Scenario: Reject invalid REST discovery

- **WHEN** the selected remote is not an exact supported GitHub repository or the REST result is non-successful, ambiguous, mismatched, closed without merge, malformed, unsafe, rate-limited, or timed out
- **THEN** the footer SHALL remain without a PR badge
- **AND** startup and the running session SHALL continue without a PR-discovery diagnostic
- **AND** no credential value SHALL appear in output, persisted state, or a request URL

#### Scenario: Show an open branch pull request

- **WHEN** bare A1's selected repository context has a current branch with open or merged pull request 567 at `https://github.com/example/project/pull/567`
- **THEN** the footer path row SHALL contain `path (branch) #567`
- **AND** only `#567` SHALL be an OSC 8 hyperlink targeting that canonical URL
- **AND** the linked number SHALL use the established web-link theme role

#### Scenario: Keep surrounding footer text outside the link

- **WHEN** the footer also has a session name
- **THEN** the row SHALL order path, branch, PR badge, and session name as `path (branch) #<number> • session-name`
- **AND** the path, branch, spaces, separator, ellipsis, and session name SHALL NOT resolve to the PR target

#### Scenario: No open pull request is available

- **WHEN** the selected context is not a Git repository, its head is detached, no open or merged PR matches its branch, the matching PR is closed without merge, or both GitHub CLI and REST discovery fail, time out, or return invalid data
- **THEN** the footer SHALL retain the selected safe path, branch, and session-name presentation without a PR badge
- **AND** startup and the running agent session SHALL continue without a PR-discovery diagnostic

#### Scenario: Pull request association changes during the session

- **WHEN** a bounded refresh observes that the selected branch gains, loses, or changes its eligible pull request association
- **THEN** the footer SHALL update to the newest normalized identity
- **AND** unchanged refreshes SHALL NOT cause redundant view updates
- **AND** no two discovery processes SHALL overlap

#### Scenario: Dispose while discovery is pending

- **WHEN** the session is disposed with a refresh timer or repository discovery process pending
- **THEN** the timer, command, and request SHALL be cancelled or released
- **AND** a late result SHALL NOT update or render the disposed session

#### Scenario: Render a narrow footer

- **WHEN** the linked PR badge reaches the footer's truncation boundary
- **THEN** the rendered row SHALL remain within its declared width
- **AND** hyperlink and foreground state SHALL close at the truncation boundary without extending to another cell or row

#### Scenario: Use the pinned comparison profile

- **WHEN** the same session and footer state are rendered through `a1 pi`
- **THEN** its output SHALL match the pinned footer without a PR badge or association-specific presentation
