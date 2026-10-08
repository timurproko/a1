## MODIFIED Requirements

### Requirement: Agents bind the owning session to the active delivery worktree

An interactive A1 delivery agent SHALL treat its one exclusively claimed task worktree as the active repository context for the delivery. After the standard cleanup sweep and before choosing an existing checkout, the agent SHALL run `a1 session worktrees` from the owning session. It SHALL treat `busy` and `unverifiable` worktrees as unavailable, SHALL NOT enter them for active repository work, and SHALL create a separate fresh task worktree when the intended candidate has either status. An `available` result is advisory rather than authority: the agent MAY reuse that checkout only when its exact branch, OpenSpec change, and pull request match the requested stream and `a1 session link-worktree <absolute-worktree>` subsequently acquires it successfully. Similar names, files, task descriptions, recent activity, clean status, or ancestry SHALL NOT establish permission to adopt a worktree.

Immediately after creating a new worktree, or after selecting an available existing worktree for a resumed delivery, the agent SHALL run `a1 session link-worktree <absolute-worktree>` from the owning session and SHALL require the command to confirm that exact canonical worktree before changing planning, implementation, test, or delivery-documentation files. A conflicting or unverifiable live-session claim SHALL be a hard pre-edit failure; the agent SHALL NOT override, recover, unlink, or wait out another owner and SHALL create a separate worktree instead. The successful claim and association SHALL remain bound to the same worktree, branch, history, and pull request through plan review and approved implementation.

The agent SHALL keep the primary checkout on `develop` and SHALL explicitly scope repository reads, edits, Git operations, builds, and tests to the active worktree. Live-session claim and repository association SHALL NOT be treated as a process/tool cwd change, Git lock, worktree cleanup registration, acceptance, finalization, merge, deletion, or cleanup authority.

If inventory or association fails, identifies another path, or is unavailable in the owning interactive session, the agent SHALL report the blocker and SHALL NOT silently continue feature edits while the footer remains associated with the primary checkout. The agent SHALL NOT infer a replacement context by scanning worktrees, choosing a recent branch or pull request, or adopting another session's checkout. When the owning session deliberately switches delivery streams, it SHALL atomically claim and link the new exact worktree before work begins there; failure SHALL leave the prior stream claimed and selected until the agent instead creates and links a fresh worktree.

A draft pull request need not exist when the worktree is first claimed and linked. After that pull request exists, the established bounded repository refresh SHALL discover its open branch association and make its `#<number>` visible in the linked bare-A1 footer without requiring tool-cwd mutation or another delivery identity.

#### Scenario: Start a feature from the primary checkout

- **GIVEN** an interactive A1 delivery session started in the primary checkout on `develop`
- **WHEN** the agent runs the worktree inventory and creates its fresh feature worktree from the selected target
- **THEN** it SHALL successfully claim and link that absolute worktree to the owning session before writing planning or implementation files
- **AND** all repository operations SHALL be explicitly scoped to that worktree
- **AND** the primary checkout SHALL remain on `develop`

#### Scenario: Similar existing worktree is busy

- **GIVEN** an existing worktree appears related to the requested task
- **WHEN** inventory reports that another live session owns it
- **THEN** the agent SHALL NOT use that checkout for repository work or attempt to displace its owner
- **AND** SHALL create and claim a separate task worktree

#### Scenario: Existing worktree is available and matches the stream

- **GIVEN** inventory reports an existing worktree as available
- **AND** its exact branch, OpenSpec change, and pull request match the delivery being resumed
- **WHEN** atomic linking still finds it available
- **THEN** the agent MAY claim and reuse that exact checkout
- **AND** SHALL NOT treat inventory alone as ownership authority

#### Scenario: Available result loses a race

- **GIVEN** inventory reported an existing worktree as available
- **WHEN** another runtime claims it before this session links it
- **THEN** this session's link SHALL fail without changing either session's ownership
- **AND** the agent SHALL create a fresh worktree rather than override or retry takeover

#### Scenario: The linked feature gains a draft pull request

- **GIVEN** the owning session is linked to its feature worktree and branch
- **AND** the feature's draft pull request did not exist when the link was established
- **WHEN** the draft pull request is created and bounded repository refresh observes it
- **THEN** the bare-A1 footer SHALL show that worktree path and branch with the pull request's `#<number>`
- **AND** it SHALL NOT continue presenting the primary checkout's `develop` context

#### Scenario: Resume approved implementation

- **GIVEN** planning exists in a released worktree, branch, and draft pull request
- **WHEN** a later interactive session verifies availability and acquires that delivery for approved implementation
- **THEN** it SHALL claim and link the exact existing worktree before editing
- **AND** implementation SHALL continue in the same worktree, branch, history, and pull request rather than create a second delivery context

#### Scenario: Resume conflicts with a live owner

- **GIVEN** planning exists in a worktree associated with an earlier session
- **WHEN** that worktree remains claimed by a live runtime or its ownership cannot be verified
- **THEN** the later session SHALL NOT resume or edit it
- **AND** SHALL use a separate worktree unless the original runtime is cleanly stopped or later verified absent

#### Scenario: Switch to another delivery stream

- **GIVEN** the session claims and associates one delivery worktree
- **WHEN** it deliberately begins or resumes another owned delivery
- **THEN** it SHALL atomically claim and link the new exact worktree before reading or changing that stream as active work
- **AND** a failed transfer SHALL preserve the prior claim and association
- **AND** footer discovery SHALL stop using the prior stream's branch and pull request only after a successful transfer

#### Scenario: Worktree association fails

- **WHEN** worktree inventory or `a1 session link-worktree` fails, is unavailable, reports a live or unverifiable owner, or confirms a path other than the intended worktree
- **THEN** the agent SHALL report the exact blocker and stop before feature edits in that checkout
- **AND** SHALL NOT continue from the primary checkout, guess among local worktrees, claim that the session switched successfully, or bypass ownership with an ad hoc command

#### Scenario: Linking does not transfer other authority

- **WHEN** an owned worktree is claimed and linked to the session
- **THEN** commands SHALL still address that worktree explicitly because tool cwd is unchanged
- **AND** Git locks, cleanup ownership, acceptance, finalization, merge, and deletion SHALL continue to require their independent established evidence and commands
