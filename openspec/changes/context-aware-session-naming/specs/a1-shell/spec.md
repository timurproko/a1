## ADDED Requirements

### Requirement: Bare A1 automatically names eligible prompt-driven sessions

When the enabled-by-default `sessionAutoName` setting is enabled, bare A1 SHALL generate and persist a short automatic session name for an unnamed session during its first user-prompt agent run. Generation SHALL run independently of the main response, wait for that run's prompt projection when necessary, and SHALL NOT run for startup, slash commands, compaction, or automatic retries alone. The `a1 pi` comparison profile SHALL receive no new automatic naming behavior. Existing authoritative name consumers SHALL publish the persisted result without a separate terminal-title channel.

#### Scenario: First prompt arrives after the agent-run event
- **WHEN** an eligible unnamed bare-A1 session begins a user-prompt run before that prompt is projected
- **THEN** naming SHALL wait for that run's usable user prompt and generate during the run without waiting for settlement
- **AND** it SHALL persist one automatic name and expose it through normal session metadata updates

#### Scenario: Ordinary follow-up prompts retain the task name
- **WHEN** an automatically named session receives more prompts in the same completed naming context
- **THEN** those prompts SHALL NOT launch additional naming requests

#### Scenario: Naming is disabled or the comparison profile is active
- **WHEN** the setting is disabled or the user runs `a1 pi`
- **THEN** this feature SHALL NOT generate or apply automatic session names
- **AND** disabling the setting SHALL cancel any pending naming request

### Requirement: Worktree context transitions invalidate automatic naming

Bare A1 SHALL distinguish naming contexts using the bound session and validated repository association revision and branch. Successful worktree switches and explicit exit/re-entry into the same worktree SHALL create a distinguishable context, even when the intermediate exit occurs between metadata polls. Idempotent links, runtime activation, claim heartbeats, ordinary metadata refreshes, HEAD changes, and PR-check updates SHALL NOT create a new naming context. Unavailable or unverifiable observation alone SHALL NOT be interpreted as a confirmed exit.

#### Scenario: Re-enter the same worktree between polls
- **WHEN** the session clears its association and relinks the same worktree before the next metadata read
- **THEN** the new association revision SHALL distinguish it from the previous context
- **AND** the old automatic naming context SHALL become pending for regeneration

#### Scenario: Refresh or relink without a transition
- **WHEN** a valid unchanged association is relinked, activated, or refreshed
- **THEN** its association revision SHALL remain stable
- **AND** naming SHALL NOT be invalidated by that operation

#### Scenario: A context probe fails temporarily
- **WHEN** the association or branch cannot be verified during a transient probe failure
- **THEN** naming SHALL NOT invent an exit or generate a new name from that failure
- **AND** automatic apply SHALL require a verified current context

### Requirement: Context-aware regeneration uses a fresh user prompt

After a confirmed context transition, bare A1 SHALL retain the displayed name and mark automatic naming pending. The next user-prompt run in that context SHALL generate a replacement from that run's prompt and bounded current repository hints rather than the first-ever prompt or the old conversation. Multiple transitions without a new prompt SHALL coalesce to the latest context. A context transition during an existing run SHALL NOT reinterpret that run's already-started prompt as a fresh prompt in the new context. Completed naming context SHALL persist across restart and resume.

#### Scenario: Start a different task after leaving a worktree
- **WHEN** an automatically named session leaves one worktree, enters another, and receives a new user prompt
- **THEN** it SHALL regenerate its automatic name from that new prompt and current context
- **AND** it SHALL NOT reuse the original task prompt as naming input

#### Scenario: Context changes during an agent turn
- **WHEN** a context transition occurs after a user-prompt run has begun
- **THEN** that run's pending naming result SHALL be invalidated
- **AND** regeneration SHALL wait for the next user-prompt run in the latest context

#### Scenario: Resume without a context change
- **WHEN** a session resumes with verifiable automatic provenance and the same completed naming context
- **THEN** it SHALL retain its name without another generation request

#### Scenario: Resume after a context change
- **WHEN** a session resumes with verifiable automatic provenance but a different current naming context
- **THEN** its next user-prompt run SHALL be eligible for regeneration

### Requirement: User name ownership and current binding take precedence

Bare A1 SHALL persist verifiable automatic-name provenance without adding model-visible conversation content. Names with absent or unverifiable automatic provenance SHALL be preserved as user-owned. Explicit manual or external public renames SHALL take ownership even when their text equals an existing automatic name. Before applying an automatic result, A1 SHALL guard the exact current session binding, authoritative context revision, name-entry identity, ownership, enabled state, and cancellation. Results for an obsolete binding or context SHALL NOT change the current name.

#### Scenario: A manual rename wins a pending request
- **WHEN** a manual or external rename occurs while automatic generation is pending
- **THEN** the pending result SHALL NOT overwrite that rename
- **AND** subsequent worktree transitions and resume SHALL preserve manual ownership

#### Scenario: Manual rename repeats the automatic text
- **WHEN** the user explicitly sets the name to the same text currently supplied by automatic naming
- **THEN** that name SHALL become user-owned despite unchanged text

#### Scenario: An older request completes after session replacement
- **WHEN** a naming request completes after the session binding or authoritative context has changed
- **THEN** it SHALL be discarded without renaming the current session or applying fallback to it

#### Scenario: Resume a legacy named session
- **WHEN** a resumed session has a name but no verifiable automatic-name provenance
- **THEN** this feature SHALL leave that name unchanged

### Requirement: Naming completion is bounded and non-blocking

Automatic naming SHALL use the active session model through a separate tool-free completion and SHALL NOT add agent turns, execute tools, alter the main run's busy state, or block its response. Names SHALL retain the former lowercase hyphenated format and maximum length of 16 characters. Generation SHALL allow at most two attempts with respective 4,096 and 32,768 token ceilings and a 30-second deadline per attempt, followed by a deterministic current-prompt fallback only while the request remains eligible. Context change, binding change, setting disablement, and disposal SHALL cancel pending naming and prohibit stale fallback. At most one generation chain SHALL be active at a time.

#### Scenario: Provider returns no usable title
- **WHEN** both bounded attempts fail or return unusable output for a still-current request
- **THEN** naming SHALL use a normalized fallback from the first three prompt words, or `new-task` when no usable words exist
- **AND** the main agent run SHALL remain independent of naming failure

#### Scenario: Cancel a request before a late provider response
- **WHEN** a naming request is invalidated or the application is disposed
- **THEN** its completion SHALL be aborted where supported and late output SHALL be ignored
- **AND** no fallback or automatic rename SHALL be applied for that cancelled request

### Requirement: Automatically changed status-bar names reveal in the secondary accent

Bare A1 SHALL reveal the status-bar session-name segment when a successful automatic generation or regeneration changes its visible name, including a deterministic fallback. The truecolor transition SHALL reproduce the later pre-pivot tab behavior: a 600 ms tonal shimmer over the previous name, a 45 ms per-grapheme reveal of the new name, and a 300 ms fade to ordinary dim footer text. Colored phases SHALL use the configured accent's live derived secondary-heading color, not a primary-accent sweep, fixed color table, or rainbow. In non-truecolor mode the transition SHALL use a plain typewriter reveal without color-sweep phases or generated truecolor escapes. Animation SHALL remain ephemeral footer presentation; the authoritative name, terminal title, and selector labels SHALL receive the complete name immediately.

#### Scenario: Generate the first name
- **WHEN** automatic naming successfully changes an unnamed session to a named session
- **THEN** the status-bar name SHALL reveal using the secondary-accent transition with an empty previous-name segment
- **AND** the full name SHALL be persisted and published independently of animation frames

#### Scenario: Regenerate after a task-context change
- **WHEN** eligible regeneration changes an existing automatic name
- **THEN** the status bar SHALL shimmer over its previous name, reveal the new name, and fade to ordinary dim text
- **AND** the terminal title SHALL update directly to the complete new name without intermediate frame text

#### Scenario: Change accent during a reveal
- **WHEN** the configured accent changes while a name reveal is active
- **THEN** subsequent colored frames SHALL use its live derived secondary-heading color
- **AND** elapsed animation time SHALL NOT restart

### Requirement: Name reveal is width-safe and bound to a single automatic apply

Bare A1 SHALL identify automatic name applications within the current session binding so only one changed application starts a reveal. Duplicate notifications, unrelated redraws, unchanged generated names, and initial/resumed named-session presentation SHALL NOT replay it. Frames SHALL clip and measure graphemes before styling, reserve the wider clipped endpoint width during the transition, obey the existing footer path/PR truncation policy, and leave other footer segments unchanged. Animation scheduling SHALL exist only for an active transition on an active presenter. Manual rename, session replacement, presenter deactivation, and disposal SHALL cancel old animation; a newer automatic name SHALL supersede it. The comparison profile SHALL receive no name-reveal behavior.

#### Scenario: Repeated views do not restart a reveal
- **WHEN** duplicate automatic-name metadata or unrelated transcript, status, usage, or PR updates arrive during a reveal
- **THEN** the original transition SHALL continue from its existing elapsed time without restarting

#### Scenario: Resume or regenerate the same visible name
- **WHEN** a named session resumes or regeneration produces the same visible name
- **THEN** the name SHALL remain settled without replaying the reveal

#### Scenario: Resize around wide or combining text
- **WHEN** the terminal width changes during a reveal with wide or combining graphemes
- **THEN** frames SHALL recalculate clipping and stable endpoint width without splitting graphemes or restarting phase
- **AND** footer rows SHALL remain within terminal width and retain existing PR/path priority

#### Scenario: Manual rename interrupts animation
- **WHEN** a manual rename occurs during automatic name animation
- **THEN** the full manual name SHALL appear immediately and cancel the automatic reveal

#### Scenario: Finish or deactivate the presenter
- **WHEN** a reveal finishes or its presenter is deactivated, rebound, or disposed
- **THEN** the animation scheduler SHALL stop requesting frames for that transition
- **AND** later presenter activation SHALL show the current authoritative name without replay
