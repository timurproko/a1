# A1 Shell Specification

## Purpose
Defines the installed `a1` command surface, version and help output, startup budgets, and the session title, naming, footer and export behavior of the owned interactive UI.


## Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the update command for the
channel of the running release: npm tag `latest` for a stable build and the npm
development dist-tag `next` for a `-dev.N` build. `a1 update --release` SHALL
select `latest` from either channel and `a1 update --develop` SHALL select `next`.
A positive preview number or full numbered preview version MAY follow `--develop`
to select one immutable publication; the preview number is the pull request number
recorded in a published preview's manifest, or the trailing number of a
`<version>-dev.<number>` preview. Invocation SHALL authorize the ownership-safe
replacement transaction and return to the invoking shell after reporting its final
result.

The application SHALL NOT accept any `update:<selector>` command or `a1 update self`.
Each SHALL exit with status 2 and one diagnostic on stderr and SHALL NOT resolve the
registry, start the interactive runtime, or install anything.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update --develop` while an older verified A1 release is active
- **THEN** A1 SHALL perform the replacement transaction using the exact version selected by the development dist-tag and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that it is up to date without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** A1 cannot prove that the update lease, transaction, or immutable release store belongs to the expected installation
- **THEN** the update SHALL fail safely without terminating any process or deleting release or update state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active release without manual cleanup

#### Scenario: Another target was interrupted by a process that is gone
- **WHEN** the user runs `a1 update --develop 828` while the update lease names a process that is no longer alive and the durable transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll that transaction back to its prior verified release, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828 in the same invocation

#### Scenario: Launch after a completed update
- **WHEN** the user runs bare `a1` after the update command reported success
- **THEN** A1 SHALL launch the already active target without printing installation or activation messages

#### Scenario: Replace with a numbered preview
- **WHEN** the user runs `a1 update --develop 828` and exactly one published preview records pull request 828 or ends in `-dev.828`
- **THEN** A1 SHALL install that exact immutable preview

#### Scenario: Replace with an exact preview
- **WHEN** the user runs `a1 update --develop 0.2.7-dev.1218` and that preview is published
- **THEN** A1 SHALL install exactly `0.2.7-dev.1218`

#### Scenario: Removed update notation is used
- **WHEN** the user runs `a1 update:develop`, `a1 update:107`, `a1 update:0.1.8-dev.107`, or `a1 update self`
- **THEN** A1 SHALL exit with status 2 after printing one diagnostic to stderr, with empty stdout and no registry, package, or runtime work

### Requirement: Stable platform claims require certification
The owned terminal UI SHALL be pure JavaScript on Node and SHALL carry no platform-specific native artifact. A stable support claim for a platform SHALL require that platform's exact-package validation lane to pass; no physical terminal, native addon, or terminal-host certification SHALL be required or implied.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes its selected gates on some but not all supported platform lanes
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable support for the unvalidated platforms

#### Scenario: The package is inspected
- **WHEN** a published package is unpacked on any platform
- **THEN** it SHALL contain no `.node` addon, native manifest, or platform-specific directory

### Requirement: Package identity is authoritative throughout release handling
Version discovery, self-update, installed metadata lookup, immutable release derivation, and update recovery SHALL use `@timurproko/a1`, taken from the single product identity authority, as the sole accepted package identity. A release manifest or recovery capsule naming any other package SHALL be rejected.

#### Scenario: Materialize the new package
- **WHEN** A1 reads or validates an immutable release manifest or an update recovery capsule
- **THEN** it SHALL accept `@timurproko/a1` metadata and SHALL reject any other package name as invalid

#### Scenario: Query release channels
- **WHEN** `a1 version`, `a1 update`, or `a1 update --develop` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

### Requirement: Interrupted update preserves the public command
After an update accepts cancellation or loses its invoking updater or terminal process, A1 SHALL automatically leave or restore the complete platform launcher set needed to invoke `a1`. The recovered command SHALL execute either the prior verified immutable release or the completely installed target and SHALL retain the durable update transaction needed to continue or roll back. Recovery SHALL require no manual npm installation, launcher reconstruction, process termination, or A1 state deletion.

#### Scenario: User cancels during global package replacement
- **WHEN** the user interrupts `a1 update` while the package manager has removed or renamed a public launcher
- **THEN** A1 SHALL coordinate cancellation and SHALL NOT return an acknowledged cancellation to the shell until the complete platform launcher set is callable

#### Scenario: Invoking updater or terminal exits
- **WHEN** the invoking updater or its terminal process exits during global package replacement
- **THEN** an independently surviving recovery owner SHALL complete a safe package boundary or restore a verified recovery launcher without user intervention

#### Scenario: User invokes a restored recovery launcher
- **WHEN** package replacement did not leave a complete installed target and the user next invokes `a1`
- **THEN** the launcher SHALL use verified recovery evidence to run the prior immutable release or continue the recorded transaction to one verified active or rollback release

#### Scenario: Recovery authority is invalid
- **WHEN** launcher recovery evidence names an unexpected path, package, transaction, release identity, or changed launcher payload
- **THEN** A1 SHALL reject that evidence and SHALL NOT execute or install content from it

### Requirement: Interactive launch forms use the owned Pi UI pipeline directly
Bare `a1` SHALL launch the A1-owned single-agent UI directly, and `a1 --session <path|id>` SHALL resume the selected session in that same UI. Prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1 surfaces withheld and Pi's ordinary profile selected. No launch form SHALL present a tab strip, start a resident host or bridge, run more than one agent, or introduce a PTY, terminal parser, or byte relay. The words `agent`, `solo`, `tabs`, and `ui` SHALL be reserved: as the first argument each SHALL be rejected with status 2 and one diagnostic rather than launched or treated as a prompt.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start one fresh direct single-agent owned UI without a tab strip, resident host, or profile argument

#### Scenario: Resume a session
- **WHEN** the user runs a supported `a1 --session <path|id>` form
- **THEN** A1 SHALL start the same direct single-agent owned UI for the selected saved session

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare `a1` after a previous session exited
- **THEN** A1 SHALL start a fresh session and SHALL NOT look for, reattach to, or restore earlier running agents

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Removed words are given
- **WHEN** the user runs `a1 solo`, `a1 tabs`, `a1 ui`, or `a1 agent`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic that names `--` as the way to pass a literal instruction, and SHALL select no runtime

#### Scenario: Two launches select one session
- **WHEN** two A1 processes select the same canonical session file
- **THEN** the shared session-writer guard, implemented without native code, SHALL admit one writer and apply the session-resume conflict behavior to the other

### Requirement: Interactive launch forms run as one directly attached process
Every interactive launch SHALL run as one directly attached process tree: the launcher selects the approved immutable release and runs its UI entry with inherited standard streams, and nothing survives the launcher. The launcher SHALL start no supervisor, detached host, job object, or process group, SHALL NOT read terminal input or parse output, and SHALL NOT select a second rendering path. Closing the terminal SHALL end the tree through ordinary operating-system behavior.

#### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1` or `a1 --session …`
- **THEN** the owned product UI SHALL run as the launcher's one directly attached child and SHALL exit when the launcher's terminal closes

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI SHALL run under the same single-process boundary without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent process tree rather than acquiring a product-wide foreground slot or contacting the other instances

#### Scenario: The UI exits uncleanly
- **WHEN** the UI child ends with an unexpected status while the launcher still owns the terminal
- **THEN** the launcher SHALL perform the bounded terminal reset and print the armed resume notice once, and SHALL NOT restart the child

### Requirement: Interactive startup evaluates a bounded single-process readiness graph
An installed interactive launch SHALL load and evaluate before first input-ready render only the runtime capabilities required to render the selected profile and safely accept user input. Settings, engine initialization, selected session state, model scope, executable resources, tools, extensions, and terminal behavior that affect the first accepted prompt SHALL be ready before that frame. Optional workflows and presentation features that do not affect those guarantees SHALL NOT enlarge the eager startup graph.

On the accepted Defender-enabled Windows release runner, every interactive profile the candidate itself advertises SHALL reach the first input-ready frame within 2 seconds after a completed update and on a warm launch. On a restart-equivalent launch, in which no A1 process has run since the approved active release was last validated, each advertised profile SHALL reach that frame within 2.5 seconds. The measured set SHALL follow the candidate's own version-derived capabilities rather than a fixed pair: a prerelease candidate advertises `a1` and `a1 pi` and SHALL measure both, while a stable candidate advertises `a1` alone and SHALL measure it alone and SHALL prove that `a1 pi` remains the quiet no-op that a non-prerelease build is required to expose. The deliberate absence of the comparison profile SHALL NOT be recorded as a startup failure or as a missing measurement. These budgets SHALL apply to every supported Windows Node lane and SHALL be evaluated on the first attempt of every measurement. Stable publication SHALL fail on any first-attempt overrun. Development previews, nightly publication, and complete regression SHALL record every measurement as evidence and SHALL judge a lane, profile, and launch kind regressed only when its three most recent consecutive `develop` measurements of the same workflow all exceed the budget; a single overrun on those channels is a warning with the measured phases, never a run failure.

#### Scenario: First launch follows update
- **WHEN** a completed exact-package update has activated and warmed a new release
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds without loading optional feature implementations solely for future use

#### Scenario: Warm launch starts another session
- **WHEN** the active release and dependency layer have already served an interactive launch
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds

#### Scenario: Restart-equivalent launch
- **WHEN** an approved active release has valid durable certification and no A1 process has run since it was last validated
- **THEN** every advertised interactive profile SHALL validate the release, start its UI child, and paint a genuinely input-ready frame within 2.5 seconds

#### Scenario: A stable candidate advertises no comparison profile
- **WHEN** first-attempt startup validation runs against a candidate whose version declares no prerelease
- **THEN** the gate SHALL measure the `a1` profile alone against the same budgets and lanes
- **AND** it SHALL confirm that `a1 pi` exits quietly without launching an interactive profile
- **AND** that quiet exit SHALL NOT be reported as a launch that ended before first render

#### Scenario: User submits immediately after first render
- **WHEN** the editor accepts input at the first input-ready frame
- **THEN** the selected settings, model scope, resources, tools, extensions, terminal semantics, and session state SHALL already apply to that submission

#### Scenario: Optional feature is first requested
- **WHEN** the user invokes a deferred settings, selector, package, rich-rendering, clipboard, image, export, or similar optional capability
- **THEN** A1 SHALL load it without changing its documented behavior or losing the triggering interaction

#### Scenario: A scheduled channel measures one overrun
- **WHEN** a nightly publication or complete regression measurement exceeds its budget while the two previous `develop` measurements of that lane, profile, and launch kind did not
- **THEN** the run SHALL record the measurement, annotate the overrun with its dominant phases, and succeed

#### Scenario: A scheduled channel measures a persistent overrun
- **WHEN** the three most recent consecutive `develop` measurements of one lane, profile, and launch kind all exceed the budget
- **THEN** the startup budget SHALL be judged regressed for that key and the nightly regression triage SHALL propose its fix with the three measurements as evidence

### Requirement: Bare A1 publishes the current session as its terminal title
Bare A1 SHALL publish its authoritative session name through the standard terminal-title channel after terminal startup. It SHALL use exactly the safe single-line normalized name, or the product display name `a1` when no usable name exists, without adding a path, prefix, or suffix. This is a declared bare-A1 replacement; the explicit `a1 pi` comparison profile SHALL receive no new automatic title behavior.

#### Scenario: Start an unnamed session
- **WHEN** bare A1 starts a session with no name while the terminal retains a launcher title such as `npm root`
- **THEN** A1 SHALL publish `a1` as the terminal title after the terminal starts

#### Scenario: Resume a named session
- **WHEN** bare A1 starts or resumes a session named `home dir settings`
- **THEN** A1 SHALL publish exactly `home dir settings` as the terminal title

#### Scenario: Run the comparison profile
- **WHEN** the explicit `a1 pi` comparison profile starts or changes session name
- **THEN** the bare-A1 automatic session-title behavior SHALL remain disabled
- **AND** existing extension title behavior SHALL remain available

### Requirement: Session-derived title text cannot replay terminal controls
Bare A1 SHALL replace runs of C0/C1 controls, DEL, and Unicode line/paragraph separators in a session-derived title with a space and trim outer whitespace. It SHALL preserve other Unicode text, ordinary internal spaces, emoji, and emoji joiners. Empty normalized text SHALL use `a1`. Normalization SHALL affect only terminal presentation, not the persisted name.

#### Scenario: A saved name contains terminal controls
- **WHEN** a session name includes escape, bell, carriage-return, newline, tab, or C1 control characters
- **THEN** its published title SHALL contain none of those controls and SHALL remain one line
- **AND** its persisted name SHALL remain unchanged

#### Scenario: A saved name contains ordinary Unicode
- **WHEN** the authoritative session name is `  café 👩‍💻 work  `
- **THEN** the published title SHALL be exactly `café 👩‍💻 work`

#### Scenario: A saved name is unusable after normalization
- **WHEN** a session name is absent, whitespace-only, or consists only of replaced controls and whitespace
- **THEN** the published terminal title SHALL be `a1`

### Requirement: Session-title publication follows authoritative name and binding changes
Bare A1 SHALL update the title when the normalized authoritative session name changes, including names changed through public Pi metadata events outside the owned naming command. New, resumed, forked, cloned, or otherwise rebound sessions SHALL expose their current name or fallback. Unchanged normalized titles SHALL NOT be rewritten by ordinary view, transcript, status, model, usage, or streaming updates, except on presenter activation.

#### Scenario: Rename through the owned command
- **WHEN** the user submits `/name Direct Name` and the session manager normalizes it to `direct name`
- **THEN** bare A1 SHALL publish `direct name` without requiring a restart
- **AND** duplicate notifications for that same resulting name SHALL NOT duplicate title writes

#### Scenario: Rename a second time
- **WHEN** the user changes the active session name from `direct name` to `next name`
- **THEN** bare A1 SHALL publish `next name` once for that change

#### Scenario: Public session metadata changes outside the owned command
- **WHEN** Pi emits a public session-info change event after its session manager changes the current name
- **THEN** the session view SHALL expose the current manager name and bare A1 SHALL publish its normalized title
- **AND** a conflicting event payload SHALL NOT override the authoritative manager name

#### Scenario: Clear the authoritative name
- **WHEN** a public session-info change clears the session manager's name
- **THEN** the authoritative view SHALL retain its existing unnamed representation rather than inventing an engine-level product name
- **AND** bare A1's terminal title SHALL become `a1`

#### Scenario: Bind another session
- **WHEN** bare A1 creates, resumes, forks, clones, or switches to a different bound session
- **THEN** the terminal title SHALL reflect that session's normalized authoritative name or `a1` fallback
- **AND** an unchanged resulting logical title SHALL NOT require a redundant write

#### Scenario: Continue work without renaming
- **WHEN** transcript, status, model, usage, streaming, or duplicate session-view updates leave the normalized session name unchanged
- **THEN** bare A1 SHALL NOT rewrite its terminal title

### Requirement: Core titles respect active presentation and extension overrides
Only the active attached presenter SHALL publish terminal-wide titles. Activating an already-started bare-A1 presenter SHALL republish its current core session title even when unchanged. An extension title override SHALL survive unrelated updates while the core logical title is unchanged; a changed core title or presenter activation MAY replace it. Closing, disconnecting, or disposing an inactive presenter SHALL NOT overwrite the active title.

#### Scenario: Change an inactive presenter's name
- **WHEN** an inactive presenter starts or receives a session-name change
- **THEN** it SHALL NOT write a terminal-wide title
- **AND** later activation SHALL publish its latest authoritative normalized session title

#### Scenario: Reattach an already-started presenter
- **WHEN** a terminal host attaches one named presenter and later reattaches another already-started named presenter
- **THEN** each activation SHALL publish the incoming presenter's current title even if that presenter previously published the same title

#### Scenario: Attach before terminal startup
- **WHEN** the host attaches a presenter before that presenter starts its terminal
- **THEN** the attachment SHALL NOT publish a premature title
- **AND** startup SHALL publish the initial title once after the terminal is running

#### Scenario: Preserve an extension's temporary title
- **WHEN** an extension sets the title to `Working...` after core publication and unrelated view or status updates follow
- **THEN** the core title synchronizer SHALL leave `Working...` untouched
- **AND** a later session-name change or presenter reactivation SHALL restore the current core session title

#### Scenario: Remove an inactive presenter
- **WHEN** an inactive presenter is closed, disconnected, or disposed while another presenter is attached
- **THEN** it SHALL NOT overwrite that active presenter's title

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

After a confirmed context transition, bare A1 SHALL retain the displayed name and mark automatic naming pending. The next user-prompt run in that context SHALL generate a replacement from that run's prompt, bounded relevant task discussion, and bounded current repository hints rather than blindly reusing the first-ever prompt or unrelated old conversation. Short approval prompts SHALL be interpreted as continuation of the concrete task identified by relevant discussion and current context, not as standalone task descriptions. Naming input SHALL remain bounded and SHALL NOT include binary images or unbounded tool output; attachment paths SHALL NOT be treated as task subjects. Multiple transitions without a new prompt SHALL coalesce to the latest context. A context transition during an existing run SHALL NOT reinterpret that run's already-started prompt as a fresh prompt in the new context. Completed naming context SHALL persist across restart and resume.

#### Scenario: Start a different task after leaving a worktree
- **WHEN** an automatically named session leaves one worktree, enters another, and receives a new user prompt
- **THEN** it SHALL regenerate its automatic name from that new prompt and relevant current task context
- **AND** it SHALL NOT use an unrelated original task as the naming subject

#### Scenario: Approve an already discussed task
- **WHEN** the current prompt is `ok do it` and relevant discussion or verified worktree context identifies spinner style settings
- **THEN** automatic naming SHALL request a task-specific label such as `Spinner style settings` rather than a generic label such as `Implement task`

#### Scenario: Attachment paths accompany a task
- **WHEN** a user supplies task text with a pasted-image file path
- **THEN** automatic naming SHALL identify the task rather than using the attachment path or generated filename as its subject

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

Automatic naming SHALL use the active session model through a separate tool-free completion and SHALL NOT add agent turns, execute tools, alter the main run's busy state, or block its response. Names SHALL use the effective `sessionNameFormat`: lowercase hyphenated words for `kebab`, space-separated words with the first ordinary word capitalized for `sentence`, or space-separated words with every ordinary word capitalized for `title`. Readable formats SHALL preserve uppercase acronyms and internally capitalized technical spellings. Names SHALL prefer two or three descriptive task words, SHALL contain at most three words, and SHALL remain at most 32 characters including separators. Shortening SHALL retain whole task words where possible instead of enforcing the former 16-character limit. Generation SHALL allow at most two attempts with respective 4,096 and 32,768 token ceilings and a 30-second deadline per attempt, followed by a deterministic task-context fallback only while the request remains eligible. Context change, binding change, setting disablement, and disposal SHALL cancel pending naming and prohibit stale fallback. At most one generation chain SHALL be active at a time.

#### Scenario: Provider returns no usable title
- **WHEN** both bounded attempts fail or return unusable output for a still-current request
- **THEN** naming SHALL use a normalized fallback from meaningful current task context, or the words `new task` when no usable task words exist, formatted with the effective choice
- **AND** the fallback SHALL NOT blindly reproduce approval words or attachment filenames when concrete task context is available
- **AND** the main agent run SHALL remain independent of naming failure

#### Scenario: Keep three explanatory task words
- **WHEN** the model returns `spinner style settings` for an eligible session using Sentence case
- **THEN** the saved name SHALL be `Spinner style settings` without truncation at 16 characters

#### Scenario: Bound excessive titles
- **WHEN** model output or fallback exceeds three words or 32 characters including separators
- **THEN** normalization SHALL enforce both limits for every supported format

#### Scenario: Cancel a request before a late provider response
- **WHEN** a naming request is invalidated or the application is disposed
- **THEN** its completion SHALL be aborted where supported and late output SHALL be ignored
- **AND** no fallback or automatic rename SHALL be applied for that cancelled request

#### Scenario: Generate each supported format
- **WHEN** the model returns `fix API cache` for an eligible session
- **THEN** the saved name SHALL be `fix-api-cache` for kebab, `Fix API cache` for sentence, or `Fix API Cache` for title

#### Scenario: Change the format during generation
- **WHEN** the user changes the format while an otherwise eligible naming request is pending
- **THEN** its result or fallback SHALL use the latest effective choice without an additional generation request

### Requirement: Bare A1 places the session name after stats rather than the path

Bare A1 SHALL display the current session name immediately after stats/context text on the second footer row, separated by ` • ` when statistics remain visible, and before the flexible gap and right-aligned model/thinking text. This SHALL apply to automatic, manual, and resumed names. The path row SHALL contain only path, branch, and optional PR link, with no session-name suffix. An unnamed session SHALL add neither a name nor its separator. At narrow widths detailed statistics SHALL compact or truncate before the session name; the name SHALL be clipped or omitted only when space remains insufficient after expendable statistics have been reduced. Name placement or animation SHALL NOT overlap model/thinking text, wrap, add a footer row, or leave a dangling separator. The first row's path/PR policy and the comparison profile's existing placement SHALL remain unchanged.

#### Scenario: Show a named session beside its stats
- **WHEN** bare A1 renders an automatic, manual, or resumed session name
- **THEN** that name SHALL follow the stats/context text on the second footer row
- **AND** it SHALL NOT appear after the path or PR link on the first row
- **AND** model/thinking text SHALL remain right-aligned

#### Scenario: Reduce statistics before the name
- **WHEN** the terminal narrows so detailed statistics, the session name, and model/thinking text no longer fit together
- **THEN** detailed statistics SHALL compact or truncate before the session name is shortened
- **AND** the full name SHALL remain visible while it fits alongside the model/thinking segment after that reduction

#### Scenario: Space is insufficient for the name
- **WHEN** the terminal is too narrow for the full name even after expendable statistics have been reduced
- **THEN** the name SHALL be clipped to the remaining display width or omitted with its separator
- **AND** the footer SHALL NOT overlap model/thinking text or add a row

#### Scenario: Reveal a name at constrained width
- **WHEN** an automatic name reveal runs in a narrow footer
- **THEN** the same name-first width priority SHALL apply without exposing partial saved names or changing animation timing

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

Bare A1 SHALL identify automatic name applications within the current session binding so only one changed application starts a reveal. Duplicate notifications, unrelated redraws, unchanged generated names, and initial/resumed named-session presentation SHALL NOT replay it. Frames SHALL clip and measure graphemes before styling, reserve the wider clipped endpoint width during the transition, obey the stats row's remaining name budget and stats/model priority, and leave other footer segments unchanged. Animation scheduling SHALL exist only for an active transition on an active presenter. Manual rename, session replacement, presenter deactivation, and disposal SHALL cancel old animation; a newer automatic name SHALL supersede it. The comparison profile SHALL receive no name-reveal behavior.

#### Scenario: Repeated views do not restart a reveal
- **WHEN** duplicate automatic-name metadata or unrelated transcript, status, usage, or PR updates arrive during a reveal
- **THEN** the original transition SHALL continue from its existing elapsed time without restarting

#### Scenario: Resume or regenerate the same visible name
- **WHEN** a named session resumes or regeneration produces the same visible name
- **THEN** the name SHALL remain settled without replaying the reveal

#### Scenario: Resize around wide or combining text
- **WHEN** the terminal width changes during a reveal with wide or combining graphemes
- **THEN** frames SHALL recalculate clipping and stable endpoint width without splitting graphemes or restarting phase
- **AND** footer rows SHALL remain within terminal width, preserve stats/model priority, and retain the independent first-row PR/path policy

#### Scenario: Manual rename interrupts animation
- **WHEN** a manual rename occurs during automatic name animation
- **THEN** the full manual name SHALL appear immediately and cancel the automatic reveal

#### Scenario: Finish or deactivate the presenter
- **WHEN** a reveal finishes or its presenter is deactivated, rebound, or disposed
- **THEN** the animation scheduler SHALL stop requesting frames for that transition
- **AND** later presenter activation SHALL show the current authoritative name without replay

### Requirement: Successful in-session model changes use the status bar as confirmation

Bare A1 SHALL update its existing active-model and thinking-level status presentation after a successful in-session model change without adding a redundant successful-switch transcript row or dock notice. This SHALL apply to model picker selection, direct active-model switching, and scoped model cycling where available. Suppression SHALL be based on the semantic action and successful outcome, not matching rendered English message text. Model persistence, session events, and authoritative model state SHALL remain unchanged.

Failures and actionable warnings, including catalog refresh problems, SHALL remain visible. Canceled model selection SHALL remain quiet. Unrelated workflow output and comparison-profile success messages SHALL retain their existing behavior.

#### Scenario: Select a different model

- **WHEN** the reader successfully changes the active model through the unified Models dialog
- **THEN** the status bar SHALL reflect the selected model and effective thinking level
- **AND** no redundant successful model-switch message SHALL appear above the editor or in the transcript

#### Scenario: Switch directly or cycle

- **WHEN** a direct active-model command or an available scoped cycling action successfully changes the model
- **THEN** the existing status presentation SHALL update without a redundant success notice

#### Scenario: Report a model failure or warning

- **WHEN** model selection fails or produces an actionable warning
- **THEN** the failure or warning SHALL remain visible through the existing diagnostic presentation
- **AND** successful-switch suppression SHALL NOT hide it

#### Scenario: Preserve comparison output

- **WHEN** the comparison profile changes the active model
- **THEN** its existing success-message and status-update behavior SHALL remain unchanged

### Requirement: The first-row PR link follows a dim dot separator

Bare A1 SHALL render its first footer row as `path (branch) • #900` when a path, branch, and PR 900 are available. The ` • ` separator SHALL use the existing dim footer role and remain outside the PR hyperlink; only the complete PR badge SHALL retain the established link color and canonical URL. This SHALL supersede the prior space-only separator immediately before the PR badge without moving the link or the second-row session name.

Constrained widths SHALL reserve a complete PR badge before path/branch text. The separator SHALL appear only when a nonempty path prefix fits beside the complete badge; otherwise the row SHALL show the badge alone, or safely truncate it when the entire badge cannot fit. An absent PR SHALL add neither a separator nor an empty badge. Comparison-profile footer output SHALL remain unchanged.

#### Scenario: Render a normal-width PR link

- **WHEN** bare A1 has a path, branch, and linked PR and enough footer width
- **THEN** the first row SHALL contain the path and branch followed by ` • ` and the linked PR number
- **AND** the separator SHALL remain dim and outside the hyperlink

#### Scenario: Clip the path before the PR

- **WHEN** a complete PR badge and a nonempty clipped path prefix fit but the full path and branch do not
- **THEN** the path prefix SHALL truncate safely before ` • ` and the complete linked badge

#### Scenario: Show the badge without a dangling separator

- **WHEN** the row can fit the complete PR badge but no path prefix and separator
- **THEN** the badge SHALL remain complete and linked without a leading dot
- **AND** even smaller widths SHALL truncate safely without leaking hyperlink state

#### Scenario: Omit the PR segment or use comparison presentation

- **WHEN** no PR is available or the comparison profile renders its footer
- **THEN** no new PR separator SHALL be added and existing profile-specific presentation SHALL remain intact

### Requirement: Bare A1 preserves implicit session exports outside worktrees

Bare A1 SHALL store implicit HTML and format-only JSONL session exports under `~/.a1/exports/`, independently of checkout and temporary development roots. It SHALL reserve unique timestamp/session-based filenames without overwriting. Explicit output destinations and comparison behavior SHALL remain unchanged. Exports SHALL remain user data, not cleanup disposables.

#### Scenario: Export without a destination

- **WHEN** bare A1 exports HTML without an output path or exports JSONL using only its format selection
- **THEN** the absolute output path SHALL be inside the user's persistent export directory
- **AND** no default export SHALL be created in the working checkout

#### Scenario: Repeat an export

- **WHEN** the same session is exported repeatedly or a candidate filename already exists
- **THEN** every successful default export SHALL have its own reserved file without replacing prior user content

#### Scenario: Choose an explicit destination

- **WHEN** the user supplies an output filename or path
- **THEN** that destination SHALL retain its existing meaning instead of being silently redirected

#### Scenario: Preserve comparison behavior

- **WHEN** the pinned comparison profile exports a session
- **THEN** its default and explicit output behavior SHALL remain unchanged

#### Scenario: Fail while writing a reserved default

- **WHEN** writing a default export fails
- **THEN** the failure SHALL remain visible and cleanup SHALL remove only the reservation this invocation created
- **AND** existing exports SHALL remain intact

### Requirement: Version output reports the installed version and both channel heads
`a1 version`, `a1 --version`, and `a1 -v` SHALL be equivalent, SHALL print `Current`, `Develop`, and `Release` lines in that order from stable and development builds alike, and SHALL NOT start or mutate the interactive runtime, release store, active release, or update transaction. `Current` SHALL be the version in the installed package manifest. `Release` and `Develop` SHALL be the `latest` and `next` npm dist-tags of the product package, read through npm and, when that fails, directly from the registry. An absent `next` tag SHALL print `Develop: unavailable` without a diagnostic. When neither source yields valid dist-tags, both remote lines SHALL print `unavailable`, one `A1` diagnostic SHALL go to stderr, and the command SHALL still exit 0. When `PI_OFFLINE` is truthy the command SHALL query nothing and print both remote lines as `unavailable` without a diagnostic. Any argument after the version word SHALL fail with status 2.

A development build SHALL append ` (#<number>)` to its `Current` line when its installed manifest records a positive `publication.pullRequest`. Every build SHALL append the same form to the `Develop` line when the development head's published manifest records one. A missing or unreadable record SHALL leave the bare version without a diagnostic. A stable `Current` line and the `Release` line SHALL NOT carry a pull request. An installed manifest that cannot be read or holds no valid semantic version SHALL fail with status 1 and one diagnostic.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0`, the `next` dist-tag is `0.4.0-dev.123` recording pull request 123, and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0`, `Develop: 0.4.0-dev.123 (#123)`, and `Release: 0.3.1` in that order and exit 0

#### Scenario: Registry discovery fails
- **WHEN** neither npm nor the registry returns valid dist-tags
- **THEN** A1 SHALL print `Current: <installed version>`, `Develop: unavailable`, and `Release: unavailable`, emit one `A1` diagnostic on stderr, and exit 0

#### Scenario: Development tag is absent
- **WHEN** discovery returns a valid `latest` dist-tag but no `next` dist-tag
- **THEN** A1 SHALL print its `Current` line, `Develop: unavailable`, and the resolved `Release` line without a diagnostic

#### Scenario: Development build with recorded pull requests
- **WHEN** the user runs `a1 version` from `0.2.7-dev.1217` whose manifest records pull request 842 and the `next` dist-tag is `0.2.7-dev.1218` whose manifest records pull request 828
- **THEN** A1 SHALL print `Current: 0.2.7-dev.1217 (#842)`, `Develop: 0.2.7-dev.1218 (#828)`, and the `Release` line

#### Scenario: No pull request is recorded
- **WHEN** the installed development manifest or the development head manifest records no pull request, or the head manifest cannot be read
- **THEN** that line SHALL print the bare version and A1 SHALL emit no diagnostic for the missing record

#### Scenario: Offline mode is set
- **WHEN** the user runs `a1 version` with `PI_OFFLINE=1`
- **THEN** A1 SHALL print the `Current` line and both remote lines as `unavailable` without contacting npm and without a diagnostic

### Requirement: The package declares one public executable
The npm package SHALL be named `@timurproko/a1` and its manifest `bin` map SHALL contain exactly the `a1` executable pointing at the CLI entry named by the product identity authority. Other process entry files MAY ship in the package payload but SHALL NOT be registered as npm executables.

#### Scenario: Inspect package metadata
- **WHEN** the package manifest and lockfile are checked against the product identity authority
- **THEN** both SHALL name `@timurproko/a1` and declare exactly one executable, `a1`
- **AND** a different name or an additional executable SHALL fail the product-identity boundary check

### Requirement: Help lists the command grammar and unrecognized input has defined outcomes
`a1 help`, `a1 --help`, and `a1 -h` SHALL be equivalent, SHALL print the same command list to stdout, and SHALL exit 0 without launching a runtime. The list SHALL cover the bare launch, `--session`, `--session-color`, `--session-dir`, `help`, `version`, the interactive launch options, the `update` forms, `install`, `remove`, both `uninstall` forms, `list`, the `worktree` forms, the `api` form, and the `session` context aliases. It SHALL list `a1 pi` only in a prerelease build and SHALL NOT list `solo`, `tabs`, or `a1 pi` package forms. An argument after a help or version word SHALL fail with status 2.

A first argument that is not a command word SHALL NOT be a no-op. An unreserved word SHALL be the first positional instruction of a normal launch. The reserved words `agent`, `solo`, `ui`, `tabs`, and any `update:<selector>` SHALL exit with status 2 and one diagnostic. `config`, `auth`, and `mcp` SHALL exit with status 2 and a diagnostic saying the command is not available. An unrecognized operation after `a1 pi`, and `a1 pi` itself in a stable build, SHALL exit 0 with empty stdout and stderr and invoke nothing. A malformed recognized command SHALL fail with status 2 and one focused diagnostic, never the complete help.

#### Scenario: Help is requested
- **WHEN** the user runs `a1 help`, `a1 --help`, or `a1 -h`
- **THEN** A1 SHALL print the same command list for that build and exit 0 without launching a runtime
- **AND** the list SHALL include `a1 pi` only when the build is a prerelease

#### Scenario: An unreserved word is given
- **WHEN** the user runs `a1 sdjjhd`
- **THEN** A1 SHALL start a normal launch with `sdjjhd` as its instruction

#### Scenario: A reserved word is given
- **WHEN** the user runs `a1 solo`, `a1 tabs`, or `a1 update:next`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic and SHALL invoke no operation

#### Scenario: Unknown Pi operation is given
- **WHEN** the user runs `a1 pi sdjjhd`
- **THEN** A1 SHALL exit 0 with empty stdout and stderr and SHALL invoke no operation

#### Scenario: Recognized command is malformed
- **WHEN** the user gives conflicting options to `a1 update`
- **THEN** A1 SHALL fail with status 2 before any operation with one diagnostic and without the complete help text

#### Scenario: Package command help is explicitly requested
- **WHEN** the user runs `a1 install --help`, `a1 remove -h`, `a1 uninstall --help`, `a1 list --help`, or `a1 update --help`
- **THEN** A1 SHALL print that command's help and exit 0 without profile preparation, package or model work, self-update, or runtime launch
- **AND** `a1 update --help` SHALL list the current-channel, release, development, model, extension, and single-package forms together

#### Scenario: Compatibility package command help is explicitly requested
- **WHEN** the user requests help from a supported `a1 pi` package command
- **THEN** A1 SHALL print help that names the `a1 pi` forms, without profile preparation, package or model work, or runtime launch

#### Scenario: Focused package syntax guidance is needed
- **WHEN** a recognized direct or `a1 pi` package command has a missing source, unexpected argument, or unknown option
- **THEN** A1 SHALL exit with status 2 after a diagnostic and usage line for the invoked namespace rather than the complete command help

### Requirement: Startup timing is traced only on request
A1 SHALL record startup timing only when `A1_STARTUP_TRACE` names an evidence file. It SHALL then append one event per reached phase among `command-invoked`, `bootstrap-start`, `bootstrap-selected`, `durable-validation-start`, `durable-validation-complete`, `ui-entry`, `ui-modules-loaded`, `pi-services`, `resource-discovery`, `session-created`, `settings-loaded`, and `first-input-ready-render`. Each event SHALL carry the trace identity, phase, elapsed milliseconds since command invocation, process, profile, release and dependency-layer identifiers, Node version, and a file-read count, and SHALL carry no credential, prompt, or session content. Without the variable a launch SHALL perform no trace I/O and print no timing detail.

#### Scenario: Startup tracing is enabled
- **WHEN** a launch runs with `A1_STARTUP_TRACE` set to a file path
- **THEN** A1 SHALL append a phase event for each phase it reaches, ending with `first-input-ready-render` once the editor accepts input

#### Scenario: Startup tracing is not enabled
- **WHEN** the user performs an ordinary interactive launch
- **THEN** A1 SHALL write no trace file and SHALL print no startup timing detail or loading transcript
