## MODIFIED Requirements

### Requirement: Bare A1 links the current branch's open pull request from the footer

Bare A1 SHALL support one explicit optional repository-context association per stable Pi session and one exclusive live worktree claim per running runtime generation. When a valid association has a matching live claim, A1 SHALL discover the branch and its open or merged GitHub pull request from that associated worktree even when the session started in another checkout; otherwise it SHALL use the session's effective startup working tree and SHALL NOT guess among other worktrees. The durable association SHALL be scoped by stable session identity and MAY survive restart or resume, while live ownership SHALL be scoped to a distinct runtime generation and SHALL NOT be inherited by an unrelated, forked, duplicate, or concurrently resumed process.

The runtime SHALL publish bounded liveness with exact platform process identity. A worktree claim MAY transfer only after clean release or verified absence of the recorded process identity; elapsed time, heartbeat age, transcript inactivity, Git cleanliness, missing pull request, branch age, or PID alone SHALL NOT authorize takeover. Unverifiable ownership SHALL fail closed. Clean unlink, successful stream transfer, and orderly runtime disposal SHALL release live authority without granting cleanup authority. Restart or resume SHALL activate a persisted association only after safely reacquiring its worktree; a conflicting live owner SHALL force startup-context fallback.

`a1 session worktrees` SHALL provide a bounded read-only inventory of canonical same-repository Git worktrees as `current`, `busy`, `available`, or `unverifiable`. It SHALL expose path, branch, and status but no session ID, process ID, session file, prompt, transcript, or credential data and SHALL NOT reserve, recover, release, edit, clean, or delete anything. Its result is advisory; `a1 session link-worktree` SHALL atomically revalidate and acquire the target claim before updating the durable association. Exactly one of two racing runtime generations SHALL succeed. A failed link or stream switch SHALL leave the prior association and claims unchanged.

The association and claim operations SHALL validate active session/runtime identity, canonical worktree identity, non-detached branch state, and same Git common-directory identity as the session's startup repository. They SHALL NOT change tool cwd, session cwd, Git state, GitHub state, Git worktree locks, worktree cleanup registration, acceptance, merge, deletion, or cleanup authority. Missing, malformed, foreign, detached, deleted, reused, conflicting, or otherwise invalid state SHALL fail closed without making A1 startup or the running session fail.

When the selected repository context has an open or merged pull request, bare A1 SHALL render only `#<number>` directly after the footer's path and branch. The complete `#<number>` badge SHALL use the established web-link color and carry the pull request's canonical HTTPS URL as a terminal-native hyperlink. The path, branch, separator, ellipsis, and session name SHALL remain outside the hyperlink. Width allocation SHALL preserve a complete valid PR badge at ordinary constrained widths by truncating path/branch text first; widths too small for the complete badge SHALL truncate safely without leaking hyperlink or foreground state.

Discovery SHALL reread associated context and branch, and SHALL remain asynchronous, bounded, serialized, optional, and lifecycle-owned. A1 SHALL prefer bounded GitHub CLI discovery and, when it yields no eligible identity, MAY query GitHub's read-only REST API using a strictly validated GitHub `origin` repository and exact selected head branch. The REST fallback SHALL work without credentials for public repositories and MAY use a caller-provided standard GitHub environment token for private repositories without persisting or exposing it. Missing GitHub CLI or authentication, an absent or invalid GitHub remote, no open or merged PR, a closed-unmerged PR, mismatched or ambiguous results, malformed or unsafe output, rate limiting, command or request failure, and timeout SHALL leave the footer without a badge and SHALL NOT block startup or fail the session. Association, claim, branch, and PR changes SHALL refresh while the session runs, unchanged normalized observations SHALL NOT emit redundant views, and disposal SHALL release timers and active work. A transition of the same exact PR from open to merged SHALL retain the same normalized badge identity.

The badge, association, claim, and inventory are declared bare-A1 behavior. The `a1 pi` comparison profile SHALL retain its pinned footer bytes and SHALL NOT render the badge, consume the association, publish a claim, or appear as a live owner.

#### Scenario: Inventory worktrees before selection

- **GIVEN** a bare-A1 session started in a repository with several Git worktrees
- **WHEN** it invokes `a1 session worktrees`
- **THEN** every validated same-repository worktree SHALL be reported deterministically as current, busy, available, or unverifiable
- **AND** the operation SHALL NOT claim or mutate any worktree, session association, Git state, or cleanup state
- **AND** SHALL NOT reveal another session's or process's identity or content

#### Scenario: Link a delivery worktree created after session startup

- **GIVEN** a bare-A1 session started in a primary checkout on `develop`
- **AND** the session atomically claims and associates its newly created same-repository worktree on branch `fix/example`
- **AND** that branch has open pull request 567 at `https://github.com/example/project/pull/567`
- **WHEN** repository metadata refresh completes
- **THEN** the footer SHALL contain `#567` for the associated worktree
- **AND** discovery SHALL NOT continue using the primary checkout's `develop` branch
- **AND** the session and tool cwd SHALL remain the primary checkout

#### Scenario: Two runtimes race for one available worktree

- **GIVEN** two live runtime generations observe the same worktree as available
- **WHEN** both invoke `link-worktree` concurrently
- **THEN** exactly one SHALL atomically acquire and associate the worktree
- **AND** the other SHALL receive a stable active-owner failure without changing either runtime's prior association or claim

#### Scenario: Another live session owns the worktree

- **WHEN** a runtime attempts to link a worktree claimed by another verified-live runtime generation
- **THEN** linking SHALL fail with `worktree-active-in-another-session`
- **AND** SHALL NOT terminate, unlink, modify, recover, or expose the owner

#### Scenario: Ownership cannot be verified

- **WHEN** a prior claim is malformed, contended, unsupported, or its process identity cannot be established as live or absent
- **THEN** inventory SHALL report the worktree as unverifiable and linking SHALL fail closed
- **AND** age or inactivity SHALL NOT make it available

#### Scenario: Live owner is idle

- **GIVEN** a runtime still owns its worktree but has produced no recent prompt or transcript activity
- **WHEN** another session inventories or links that worktree
- **THEN** it SHALL remain busy while the exact owner process is live
- **AND** inactivity SHALL NOT transfer the claim

#### Scenario: Owner exits or crashes

- **WHEN** the owner releases its claim through orderly disposal
- **THEN** a later inventory SHALL report the worktree available
- **AND WHEN** the owner exits without release
- **THEN** a later runtime MAY acquire it only after the exact recorded process identity is verified absent

#### Scenario: Duplicate process opens the same stable session

- **GIVEN** one runtime generation holds the associated worktree claim
- **WHEN** another process opens the same stable Pi session
- **THEN** its distinct runtime generation SHALL NOT inherit or share the live claim
- **AND** its associated context SHALL fall back until it safely acquires another worktree or the original owner releases

#### Scenario: Stream transfer fails

- **GIVEN** a runtime currently owns and associates one worktree
- **WHEN** it attempts to link a second worktree that is busy or unverifiable
- **THEN** the operation SHALL leave the original claim and association intact
- **AND** footer discovery SHALL remain on the original context

#### Scenario: Keep a merged delivery link during cleanup

- **GIVEN** the selected repository context remains the same claimed associated worktree and branch
- **AND** its exact pull request was previously open and is now merged
- **WHEN** repository metadata refresh completes during post-merge verification or cleanup
- **THEN** the footer SHALL retain the same linked `#<number>` badge
- **AND** the state-only transition SHALL NOT emit a redundant normalized footer identity

#### Scenario: Keep concurrent sessions independent

- **GIVEN** two sessions started from the same primary checkout
- **AND** each session claims and associates a different valid worktree with a different open or merged pull request
- **WHEN** both footers refresh
- **THEN** each footer SHALL show only its own associated pull request
- **AND** neither session SHALL select a worktree by recency, name, scanning, or another session's record

#### Scenario: Restore association after resume

- **GIVEN** a session has a valid persisted associated worktree whose exact pull request is open or merged
- **WHEN** that same stable session is restarted or resumed and no other runtime owns the worktree
- **THEN** A1 SHALL reacquire the claim, revalidate and restore its repository context
- **AND** SHALL refresh the associated branch and pull request without requiring another association command

#### Scenario: Restore conflicts with another runtime

- **GIVEN** a persisted association points to a worktree now claimed by another live runtime generation
- **WHEN** the original stable session is restarted or resumed
- **THEN** A1 SHALL NOT activate that associated context or display its pull request as owned
- **AND** SHALL use startup repository context without displacing the live owner

#### Scenario: Reject invalid or stale association

- **WHEN** an association is malformed, foreign-repository, detached, deleted, reused with changed identity, lacks a safely acquired claim, or belongs to another runtime
- **THEN** A1 SHALL ignore it and use the startup repository context
- **AND** SHALL NOT mutate Git, GitHub, cleanup state, or another runtime's claim
- **AND** SHALL NOT fail startup or emit an unbounded diagnostic

#### Scenario: Association or branch changes during the session

- **WHEN** the session claims, sets, clears, or transfers an association, switches to another session, or the selected context's branch or pull request changes
- **THEN** bounded serialized discovery SHALL update to the newest normalized branch and PR identity
- **AND** the previous PR badge SHALL be absent unless the new context independently resolves an exact open or merged PR
- **AND** no two discovery processes SHALL overlap
- **AND** unchanged observations SHALL NOT cause redundant view updates
- **AND** stale results from an older association, claim, runtime, or session generation SHALL NOT render

#### Scenario: Preserve the badge in a constrained row

- **GIVEN** a valid linked pull request and path/branch text too wide for the footer row
- **WHEN** the row is wide enough for the complete PR badge but not all text
- **THEN** A1 SHALL truncate path/branch text before truncating `#<number>`
- **AND** only `#<number>` SHALL resolve to the canonical PR URL
- **AND** hyperlink and foreground state SHALL close within the row

#### Scenario: No explicit association exists

- **WHEN** a session has no valid explicit repository-context association and matching live claim
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

- **WHEN** bare A1's selected claimed repository context has a current branch with open or merged pull request 567 at `https://github.com/example/project/pull/567`
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
- **THEN** the timer, command, request, and live claim SHALL be cancelled or released
- **AND** a late result SHALL NOT update or render the disposed session

#### Scenario: Render a narrow footer

- **WHEN** the linked PR badge reaches the footer's truncation boundary
- **THEN** the rendered row SHALL remain within its declared width
- **AND** hyperlink and foreground state SHALL close at the truncation boundary without extending to another cell or row

#### Scenario: Use the pinned comparison profile

- **WHEN** the same session and footer state are rendered through `a1 pi`
- **THEN** its output SHALL match the pinned footer without a PR badge or association-specific presentation
- **AND** the comparison process SHALL NOT publish or acquire a delivery-worktree claim
