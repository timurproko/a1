## ADDED Requirements

### Requirement: Explicit worktree controls are independent of tool working directories

Claim-owning A1 sessions SHALL expose a sequential structured worktree control tool supporting attach, enter, detach, status, list, and complete. Controls SHALL bind to the exact active session/runtime without first resolving an attached tool cwd. Attach SHALL derive repository identity from its explicit absolute target, including when startup is outside Git or inside another repository. Enter and list SHALL accept an explicit repository selector; absent that selector they SHALL use the active repository or startup discovery, and SHALL report a missing repository selection without requiring a new session. Detach SHALL preserve files and branches and restore the immutable startup directory. Failed switching SHALL preserve the previous effective context and ownership. Explicit exclusions, extension precedence, and comparison-profile isolation SHALL remain effective.

#### Scenario: Attach after starting at home

- **GIVEN** a persistent session started in a non-repository home directory
- **WHEN** it attaches an absolute registered task worktree
- **THEN** attachment SHALL select that worktree's repository without a restart
- **AND** detach SHALL restore the original home directory

#### Scenario: Recover while ordinary tools are blocked

- **GIVEN** ordinary tool cwd validation cannot validate the prior attachment
- **WHEN** the session explicitly requests detach or attachment to a valid target
- **THEN** the control SHALL not depend on the invalid prior cwd
- **AND** SHALL preserve every other owner's claims and all Git data

### Requirement: Worktree transitions reload project context before further work

A1 SHALL recreate cwd-bound project settings, context files, skills, extensions, and tool defaults for the selected working directory using supported Pi lifecycle APIs. Target trust SHALL be resolved before project resources execute, without inheriting another project's session-only trust. The same conversation, session identity, and writer ownership SHALL be retained. Runtime replacement SHALL occur only after the issuing shell/tool has finished and its result is persisted; subsequent ordinary work SHALL not execute under stale project resources. Failed or cancelled preparation SHALL retain the previous operational context and attachment. Obsolete session generations SHALL not publish a transition. Detach SHALL also restore startup resources.

#### Scenario: Switch between repositories

- **GIVEN** repository A and repository B have different project instructions and settings
- **WHEN** an attached session selects a worktree in repository B
- **THEN** further work SHALL use B's resources after target trust resolution
- **AND** SHALL retain the existing conversation and stable session identity

#### Scenario: Target preparation fails

- **WHEN** target validation, trust cancellation, resource preparation, or ownership acquisition prevents transition
- **THEN** the session SHALL remain operational in its prior context
- **AND** SHALL not release its prior attachment or report success

#### Scenario: A running tool requests transition

- **WHEN** an active tool requests another worktree
- **THEN** its result SHALL settle before runtime recreation
- **AND** no intervening tool SHALL edit the target under the previous project's resources

## RENAMED Requirements

- FROM: `### Requirement: Completion returns the session to primary before cleanup`
- TO: `### Requirement: Completion leaves task context before repository cleanup`

## MODIFIED Requirements

### Requirement: Product commands own worktree entry and attachment

A1 SHALL expose worktree enter, attach, detach, status, list, and complete through cwd-independent controls and compatible shell commands. Enter SHALL create or resume a registered task worktree and acquire its editing claim. Shell mutations SHALL queue an exact-session request rather than changing context while their process pins the old cwd. The runtime's final confirmation SHALL return the canonical root and branch after resource reload and claim commit, without requiring a second inventory check. Existing session-context aliases SHALL remain compatible. Detach SHALL preserve worktree files and branches. Creation SHALL support configured or explicit bases without assuming a universal branch name.

#### Scenario: Create and resume a task

- **WHEN** an active session enters a valid task branch in an explicitly selected or discovered repository
- **THEN** A1 SHALL create its isolated worktree from the selected base and confirm attachment after the requesting tools settle
- **AND** repeating entry SHALL preserve matching existing uncommitted work

#### Scenario: A selected checkout cannot be acquired

- **WHEN** the selected checkout is primary, locked, mismatched, or held by another live or unverifiable runtime
- **THEN** the operation SHALL retain existing files and the prior attachment and return a bounded actionable failure
- **AND** SHALL NOT force creation, overwrite a branch, or remove a worktree

### Requirement: A definitively invalid attachment is released without blocking tools

A1 SHALL distinguish definitively invalid attachments from uncertain identity. A missing checkout or Git pointer, non-worktree root, or changed recorded worktree Git/repository identity SHALL be definitive only when the recorded selected-repository anchor still verifies. Startup need not be a Git repository. A1 SHALL release only the session's association and claim, fail the triggering ordinary tool once, and reload startup resources at the safe idle boundary before further ordinary work. Uncertain failures SHALL retain the attachment and SHALL not redirect writes. Explicit controls SHALL remain callable without resolving the invalid cwd and SHALL preserve Git data and other owners' claims.

#### Scenario: The attached checkout was removed

- **GIVEN** an attachment whose checkout or Git pointer is missing but whose repository anchor verifies
- **WHEN** an ordinary tool runs
- **THEN** it SHALL fail without executing elsewhere
- **AND** A1 SHALL restore startup resources at the idle boundary before subsequent ordinary tools run

#### Scenario: A session resumes with an invalid attachment

- **WHEN** a persisted session resumes with a definitively invalid attachment
- **THEN** activation SHALL restore startup context without requiring manual metadata recovery

#### Scenario: Validation is uncertain

- **WHEN** validation times out, is cancelled, or cannot verify the selected repository anchor
- **THEN** the association and claim SHALL be retained
- **AND** ordinary work SHALL fail without redirection

#### Scenario: Detach from an invalid checkout

- **WHEN** explicit detach is requested while the attached checkout is missing
- **THEN** it SHALL restore startup resources and clear the association through the runtime transition
- **AND** SHALL remove no file or branch

### Requirement: Explicit detach remains callable when ordinary tool root validation fails

Claim-owning bare A1 sessions SHALL retain an argument-free sequential worktree_detach tool bound to the exact active session/runtime. It SHALL request startup context restoration without ordinary tool cwd resolution or validating the checkout being left. The runtime SHALL verify ownership and serialize association/claim mutation through existing coordination after the requesting tool result persists. It SHALL report a request separately from completed detach, restore the original startup directory and its resources, and preserve files, branches, conversation, other owners' claims, and cleanup authority. Failed, cancelled, disposed, or stale-session requests SHALL not report success. Comparison sessions SHALL not gain this tool. Explicit exclusions and extension overrides SHALL remain effective.

#### Scenario: Invalid startup identity blocks every ordinary tool

- **GIVEN** a persisted attachment whose identity cannot be validated by ordinary tools
- **WHEN** the bound session explicitly invokes worktree_detach
- **THEN** it SHALL request recovery without ordinary cwd validation
- **AND** the runtime SHALL restore startup context and clear only that session's association and claims after the requesting batch

#### Scenario: Ordinary modification encounters uncertain context

- **WHEN** an ordinary modifying tool cannot validate the attachment or its loaded project context
- **THEN** its requested operation SHALL remain unexecuted
- **AND** recovery controls SHALL not permit arbitrary commands or target-session selection


### Requirement: Authoritative worktree identity ignores inherited Git redirection

Session worktree enter, attachment and authoritative validation SHALL determine repository and worktree identity from explicitly selected filesystem roots, independent of inherited Git repository-redirection variables. The policy SHALL NOT mutate the process environment or remove unrelated authentication and user environment. Startup outside Git SHALL NOT prohibit explicit repository selection or attachment. Exact runtime identity, registered linked-worktree identity, Git locks, and cooperative ownership restrictions SHALL remain authoritative.

#### Scenario: Temporary overrides point at the target checkout

- **GIVEN** a session started outside a Git repository
- **AND** inherited Git overrides point at an unrelated checkout
- **WHEN** the session explicitly attaches a registered task worktree
- **THEN** A1 SHALL validate the explicit target independently of those overrides
- **AND** SHALL preserve the original startup directory as the detach destination

#### Scenario: Overrides point at a foreign repository

- **WHEN** inherited Git redirection points at another repository during attachment or validation
- **THEN** A1 SHALL validate the explicit target's canonical identity instead of the inherited repository
- **AND** a failed switch SHALL preserve the prior association and claims

#### Scenario: Another runtime owns the selected worktree

- **WHEN** explicit attachment selects a worktree held by another live or unverifiable runtime
- **THEN** the switch SHALL fail without changing the previous context or either owner's claims

### Requirement: Completion leaves task context before repository cleanup

A1 SHALL expose worktree completion with optional change and pull-request selectors. Completion SHALL require a valid owned attachment and SHALL retain it when Git-locked or holding tracked, staged, or untracked content. It SHALL also refuse cleanup when startup is inside the checkout being completed. Otherwise it SHALL return the session to its immutable startup directory and reload startup resources before cleanup. Cleanup SHALL run after the issuing shell exits, from the selected repository's verified primary checkout through that checkout's committed declaration, never through a declaration from the task checkout or an unrelated startup directory. A1 SHALL not delete Git data itself. Missing declarations or selectors SHALL report cleanup unavailable after detach. Another live or unverifiable owner, changed repository identity, or an expired request SHALL skip cleanup. Results SHALL relay the cleanup command's report as authoritative.

#### Scenario: Complete a task entered from home

- **GIVEN** a session started outside Git and attached to a task worktree
- **WHEN** it completes a clean owned task
- **THEN** tools SHALL return to the startup directory
- **AND** cleanup SHALL execute from the selected repository's verified primary checkout after the issuing shell exits

#### Scenario: Complete a merged task

- **WHEN** an attached session completes a clean owned task and configured cleanup succeeds
- **THEN** tools SHALL return to the startup directory before cleanup starts
- **AND** the result SHALL relay the selected repository cleanup command's authoritative report

#### Scenario: The checkout holds unpublished content

- **WHEN** the attached checkout holds uncommitted or untracked content or is locked in Git
- **THEN** the session SHALL remain attached and no cleanup SHALL start

#### Scenario: Cleanup is blocked

- **WHEN** the configured cleanup reports a blocker after detach
- **THEN** the result SHALL name the blocker
- **AND** tools SHALL remain operational from the startup directory

#### Scenario: No cleanup command is declared

- **WHEN** the selected repository declares no cleanup command
- **THEN** completion SHALL detach, retain the checkout, and report cleanup unavailable
