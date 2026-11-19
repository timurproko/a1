## MODIFIED Requirements

### Requirement: Agents bind the owning session to the active delivery worktree

Every delivery agent SHALL establish an owned task worktree and explicitly scope repository operations to its exact canonical path. Repository delivery SHALL support agents outside A1 using ordinary Git and SHALL NOT require an installed A1 product, an active A1 shell-tool runtime, or an A1 footer association for those agents.

After the standard cleanup sweep, the agent SHALL inspect `git worktree list --porcelain`. It MAY create a fresh worktree at an unused task path on a new topic branch from current `origin/develop`, unless the maintainer selected another base. Before planning, implementation, test, or delivery-documentation edits, it SHALL verify the exact worktree root, common Git repository, intended branch, and working-tree state. A path or branch collision SHALL NOT authorize force creation, overwriting, or adoption of the existing checkout.

An existing worktree MAY be reused only when its exact branch, OpenSpec change, and pull request match the requested stream and the agent has established its own continuing ownership or an explicit handoff from the previous owner or maintainer without conflicting ownership evidence. Similar names, files, task descriptions, recent activity, clean status, or ancestry SHALL NOT establish permission to adopt a worktree. Git inventory SHALL remain advisory and SHALL NOT be described as atomic editing exclusion. A released cleanup registration SHALL be claimed through the existing cleanup ownership protocol before reuse; a foreign owned registration, Git lock, known live editing claim, or unverifiable handoff SHALL block reuse. Missing A1 integration alone SHALL NOT be treated as a conflicting or unverifiable owner.

Within an active A1 shell-tool runtime, the agent SHALL use `a1 session worktrees` and `a1 session link-worktree <absolute-worktree>` to acquire the runtime's editing claim and associate its exact task worktree. A conflicting or unverifiable live-session claim, failed association, or different returned path SHALL remain a pre-edit failure for that runtime. External agents SHALL use the Git path instead of fabricating A1 session identity or switching applications. Claude Code sessions with the established worktree integration SHALL continue following the separate Claude Code hook requirement; that adapter SHALL NOT be required of other agents.

The primary checkout SHALL remain on `develop`. Repository reads, edits, Git operations, builds, and tests SHALL explicitly address the task worktree. Context verification or runtime association SHALL NOT grant acceptance, finalization, merge, deletion, cleanup authority, or a change to process/tool cwd. Scratch SHALL remain under the task worktree's ignored `.artifacts/` root.

Resuming or switching streams SHALL repeat exact-context and ownership verification before editing. A known owner conflict SHALL NOT be bypassed, unlinked, recovered, or waited out. An agent MAY create a fresh separate worktree where safe, but SHALL preserve the existing delivery's branch/history/PR and SHALL NOT force a branch checked out by another owner or create a replacement PR to evade ownership. If no safe continuation exists it SHALL report the concrete blocker. Handoffs SHALL name the exact worktree, branch, change, and PR.

For A1 sessions, successful runtime association SHALL continue to drive bounded footer repository and PR discovery; a draft PR need not exist when linking first succeeds. External agents SHALL have no footer requirement. Cleanup ownership and runtime editing claims SHALL remain independent; neither SHALL imply authority to override the other.

#### Scenario: External agent starts a new delivery without A1

- **GIVEN** an external coding agent has Git and the repository tooling but no active A1 runtime
- **WHEN** it creates a fresh isolated task worktree and verifies its exact repository, path, branch, and state
- **THEN** it SHALL be permitted to write authorized planning or implementation files there without running A1 session commands
- **AND** the primary checkout SHALL remain on develop

#### Scenario: Resume approved implementation

- **GIVEN** an existing worktree matches the requested branch, change, and PR and has an explicit ownership handoff with no conflicting editor or Git lock
- **WHEN** the agent verifies its exact context and successfully claims any released cleanup registration
- **THEN** it MAY resume in that same worktree, branch, history, and PR without an A1 footer association

#### Scenario: Familiar checkout has no ownership evidence

- **WHEN** a checkout looks related or clean but its ownership or handoff cannot be established
- **THEN** the agent SHALL NOT adopt it based on Git inventory alone
- **AND** it SHALL use a safe fresh worktree or report the exact continuation blocker

#### Scenario: Resume conflicts with a live owner

- **WHEN** a live editing owner, foreign cleanup owner, Git lock, or failed cleanup claim prevents reuse
- **THEN** the agent SHALL stop before edits in that checkout
- **AND** it SHALL NOT override, recover, unlock, or release the other owner's work

#### Scenario: Active A1 session links its delivery

- **GIVEN** the agent runs inside an active A1 shell-tool session
- **WHEN** it begins or resumes a delivery
- **THEN** it SHALL require successful atomic linking of the exact task worktree before edits
- **AND** a conflict or failed link SHALL preserve the previous association and stop edits in the candidate checkout
- **AND** bounded footer discovery SHALL identify the linked branch's PR once it exists

#### Scenario: External agent has no session-link command

- **WHEN** A1 is absent or its command reports that an active A1 shell-tool runtime is required in an external agent environment
- **THEN** that absence alone SHALL NOT block the ordinary Git worktree path
- **AND** the agent SHALL NOT forge a runtime identity or claim that A1 linking succeeded

#### Scenario: Worktree context is wrong

- **WHEN** the canonical root, shared repository, or intended branch verification fails
- **THEN** the agent SHALL stop edits and report the mismatch
- **AND** it SHALL NOT fall back to editing the primary checkout

#### Scenario: Linking does not transfer other authority

- **WHEN** an agent establishes or resumes an owned task worktree through any supported environment
- **THEN** approval, finalization, exact-head CI, maintainer integration, and guarded cleanup SHALL retain their existing independent requirements
- **AND** command paths and scratch SHALL remain explicitly scoped to that worktree

#### Scenario: Start a feature from the primary checkout

- **GIVEN** a delivery session starts in the primary checkout on develop
- **WHEN** it creates a fresh feature worktree from the selected target
- **THEN** it SHALL establish exact Git context and ownership before writing planning or implementation files
- **AND** an active A1 session SHALL also acquire its runtime claim and association
- **AND** external agents SHALL not need A1 integration

#### Scenario: Similar existing worktree is busy

- **GIVEN** an existing worktree appears related to the requested task
- **WHEN** available ownership evidence reports another live owner
- **THEN** the agent SHALL NOT use or displace that checkout
- **AND** it SHALL create a safe separate worktree or report the exact continuation blocker

#### Scenario: Existing worktree is available and matches the stream

- **GIVEN** the exact branch, change, and PR match the delivery being resumed
- **WHEN** ownership or explicit handoff is established and any applicable cleanup and runtime claims succeed
- **THEN** the agent MAY reuse the checkout after exact-context verification
- **AND** inventory alone SHALL NOT grant authority

#### Scenario: Available result loses a race

- **GIVEN** inventory reported a worktree as available
- **WHEN** a competing owner acquires the applicable runtime or cleanup claim first
- **THEN** this session SHALL stop before edits without changing the competing ownership
- **AND** it SHALL use a safe fresh checkout or report the blocker rather than override or retry takeover

#### Scenario: The linked feature gains a draft pull request

- **GIVEN** an active A1 session linked its feature worktree before creating the draft PR
- **WHEN** bounded repository refresh observes the new PR
- **THEN** the footer SHALL show the linked branch's PR number
- **AND** this A1 display behavior SHALL impose no footer requirement on external agents

#### Scenario: Switch to another delivery stream

- **GIVEN** an agent has an established delivery context
- **WHEN** it deliberately begins or resumes another delivery
- **THEN** it SHALL verify the new exact worktree and ownership before editing
- **AND** an active A1 session SHALL atomically claim and link the new context, preserving the prior association on failure
- **AND** external agents SHALL explicitly scope their tools to the newly verified worktree

#### Scenario: Worktree association fails

- **WHEN** inventory or linking inside an active A1 runtime fails, is unavailable, reports a conflicting owner, or confirms another path
- **THEN** that session SHALL report the blocker and stop before edits in the candidate checkout
- **AND** it SHALL NOT spoof a successful association, override ownership, or edit primary instead
- **AND** an external agent with no A1 runtime SHALL follow the ordinary Git path and its independent ownership checks
