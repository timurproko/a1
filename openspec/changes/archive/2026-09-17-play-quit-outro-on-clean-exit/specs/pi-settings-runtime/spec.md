## MODIFIED Requirements

### Requirement: Fullscreen exit output is emitted after terminal restoration
When the pinned `a1 pi` comparison profile uses a fullscreen alternate surface, `fullscreenExitOutput` SHALL govern output produced after that surface is restored. `transcript` SHALL print the final conversation transcript with the same semantic ANSI styles, spacing, wrapping, and block order that pinned Pi emits when preserving its transcript, followed by an actionable resume hint. `resume-hint` SHALL print only the actionable hint.

Bare A1 SHALL NOT honor `fullscreenExitOutput`: after its fullscreen surface is restored it SHALL print only the actionable resume hint, and the pinned runtime SHALL NOT render its final document into the parent terminal. The owned settings screen SHALL omit the `fullscreenExitOutput` row for bare A1 because the transcript variant is not variable on this surface, following the existing `tuiMode` omission.

In both profiles the hint SHALL use pinned wording and dim-prefix styling, substitute the product command name, select the persisted session by compact session id, and include `--session-dir` only when the persisted session is outside the default directory. Exit output SHALL not expose a raw default session-file path and SHALL not contain alternate-screen control sequences, duplicate terminal rows, image control payloads, active animations, overlays, editor drafts, or private session data beyond what the selected transcript already displays.

#### Scenario: Exit with transcript output
- **WHEN** fullscreen `a1 pi` exits with `fullscreenExitOutput` set to `transcript`
- **THEN** the parent terminal SHALL first be restored and then receive the final styled transcript followed by an actionable resume hint
- **AND** user prompts, assistant Markdown, thinking, tools, notices, warnings, errors, and spacing SHALL preserve their pinned visible styles unless excluded by another active setting

#### Scenario: Exit with resume hint only
- **WHEN** fullscreen `a1 pi` exits with `fullscreenExitOutput` set to `resume-hint`
- **THEN** the parent terminal SHALL first be restored and then receive only the dim pinned-style `To resume this session:` prefix and product-aware resume command

#### Scenario: Exit bare A1
- **WHEN** bare A1 exits from its fullscreen surface with any stored `fullscreenExitOutput` value
- **THEN** the parent terminal SHALL first be restored and then receive only the dim pinned-style `To resume this session:` prefix and product-aware resume command
- **AND** no A1 frame row or transcript row SHALL be written to the parent terminal
- **AND** the owned settings screen SHALL not offer a `fullscreenExitOutput` row

#### Scenario: Format a default-directory resume command
- **WHEN** the persisted session uses the default session directory
- **THEN** the resume command SHALL contain the product command and compact session id
- **AND** it SHALL contain neither `--session-dir` nor the raw session-file path

#### Scenario: Format a custom-directory resume command
- **WHEN** the persisted session uses a non-default session directory
- **THEN** the resume command SHALL place a correctly quoted `--session-dir` before `--session` and SHALL resume the exact session id

#### Scenario: Exit after a failure
- **WHEN** the shell fails while the alternate screen is active
- **THEN** terminal restoration SHALL still precede the configured bounded exit output

### Requirement: Normal A1 exit hints round-trip through the public command
A resume hint emitted by the normal A1 profile SHALL be accepted by that build's installed public CLI and restore the exact persisted session using that build's pinned Pi behavior when run from the original project with its session store available. Acceptance SHALL exercise a newly created and persisted disposable conversation, including supported compaction, rather than require recovery of the user's current session or an unsupported forward format. Default-directory hints SHALL retain compact session IDs without raw default file paths. Custom-directory hints SHALL retain correctly quoted `--session-dir` before `--session`. Bare A1's hint-only exit and the comparison profile's `transcript` and `resume-hint` modes SHALL share this executable behavior, preserve existing terminal-restoration ordering and styling, and SHALL NOT claim resumability for an unpersisted session. Formatting-only assertions SHALL NOT constitute end-to-end resume evidence.

#### Scenario: Execute a default-directory hint
- **WHEN** a newly created normal A1 session persists conversation messages in default storage, exits, and the user copies its hint into the original project shell
- **THEN** the public command SHALL restore the same session identity and persisted conversation rather than silently exit or launch an empty session

#### Scenario: Execute a custom-directory hint
- **WHEN** a normal A1 session exits with custom storage whose path needs shell quoting and the user executes the hint
- **THEN** the public command SHALL preserve the directory argument and restore the exact session ID

#### Scenario: Compare exit modes
- **WHEN** the same persisted session exits from bare A1 and from the comparison profile using `transcript` or `resume-hint`
- **THEN** every emitted command SHALL select the same session without changing the declared output style or terminal cleanup behavior

#### Scenario: Session was never persisted
- **WHEN** the normal A1 UI exits without a persisted resumable session
- **THEN** it SHALL NOT emit a command claiming that session can be resumed
