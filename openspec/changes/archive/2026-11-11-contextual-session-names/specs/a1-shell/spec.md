## MODIFIED Requirements

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
