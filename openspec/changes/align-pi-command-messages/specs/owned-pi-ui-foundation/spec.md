## ADDED Requirements

### Requirement: Command outcome messages retain pinned wording and severity
Every existing supported Pi-backed command SHALL reproduce pinned Pi's user-visible messages for equivalent success, failure, warning, empty, progress, and cancellation states. Parity SHALL include whether a message is emitted at all, its literal wording and punctuation, contextual prefixes, links, severity, and order. Existing declared A1 route replacements and layout/progress customizations SHALL remain explicit exceptions only within their declared scope; they SHALL NOT justify changing unrelated command-result messages. Actual selected-profile paths and truthful runtime values SHALL remain contextual data, not copied values from another profile.

For fatal `/new`, `/resume`, and `/import` outcomes, A1 SHALL preserve Pi-compatible visible error semantics but SHALL retain its recoverable workflow/session contract: the route returns a failed result and the owning A1 session remains active rather than stopping the terminal or propagating Pi's process exit. This lifecycle difference SHALL be recorded as an explicit contextual exception and SHALL NOT be presented as process-behavior parity.

#### Scenario: Login saves an API key
- **WHEN** a supported provider login successfully stores an API key
- **THEN** the success label SHALL be `Saved API key for <provider>` rather than `Logged in to <provider>`
- **AND** the selected-model clause and `Credentials saved to <auth path>` clause SHALL appear exactly when pinned Pi emits them for the equivalent state

#### Scenario: Login completes OAuth or has a partial failure
- **WHEN** OAuth authentication succeeds, default-model selection fails, catalog refresh times out or fails, or credentials are saved but local state cannot synchronize
- **THEN** A1 SHALL emit the same success, warning, and contextual failure sequence as pinned Pi for that outcome
- **AND** it SHALL NOT claim a model was selected or credentials synchronized unless that work succeeded

#### Scenario: Logout has no stored credentials
- **WHEN** no stored credentials are available to remove
- **THEN** A1 SHALL emit dim `No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.`
- **AND** it SHALL NOT substitute `No authenticated providers available.`

#### Scenario: Logout fails
- **WHEN** logout fails before credential removal or removes credentials but fails local synchronization
- **THEN** A1 SHALL retain pinned Pi's distinct `Logout failed: <detail>` or `Credentials removed for <provider>, but local model state could not be synchronized: <detail>` error context as applicable

#### Scenario: Fork has no messages
- **WHEN** there are no messages available for `/fork`
- **THEN** A1 SHALL emit dim `No messages to fork from` as a status, not an error

#### Scenario: Clone has no session position
- **WHEN** `/clone` has no active branch position to clone
- **THEN** A1 SHALL emit dim `Nothing to clone yet` as a status, not an error

#### Scenario: Import fails
- **WHEN** a session import fails after any applicable confirmation or missing-cwd recovery
- **THEN** the error SHALL preserve Pi's `Failed to import session: <detail>` context
- **AND** usage, declined confirmation, extension cancellation, and successful import SHALL retain their distinct pinned messages or silence

#### Scenario: A fatal command outcome remains recoverable in A1
- **WHEN** `/new`, `/resume`, or `/import` reaches an outcome for which pinned Pi stops its terminal and exits one
- **THEN** A1 SHALL emit the equivalent contextual error with the pinned wording, severity, and order and SHALL NOT emit a false success
- **AND** A1 SHALL return its recoverable failed workflow result and keep the owning session active
- **AND** acceptance evidence SHALL label shutdown and process-exit behavior as an explicit contextual exception rather than claim lifecycle parity

#### Scenario: Share succeeds
- **WHEN** `/share` successfully creates a secret gist
- **THEN** A1 SHALL emit dim `Share URL: <viewer URL>` followed by `Gist: <gist URL>` with Pi's line break and ordering
- **AND** for the current pinned version the default viewer URL SHALL be `https://pi.dev/session/#<gist ID>` and a configured `PI_SHARE_VIEWER_URL` SHALL determine the base using pinned semantics

#### Scenario: Share fails or is cancelled
- **WHEN** the GitHub CLI is absent, is not logged in, session export fails, gist creation fails, or the user cancels creation
- **THEN** A1 SHALL retain Pi's distinct installation/authentication guidance, export/gist error context, or `Share cancelled` status as applicable
- **AND** no success link SHALL be emitted on failure or cancellation

#### Scenario: Existing matching commands complete
- **WHEN** `/copy`, `/export`, `/name`, `/session`, `/hotkeys`, `/changelog`, `/model`, `/scoped-models`, `/tree`, `/trust`, `/resume`, `/reload`, `/new`, `/compact`, or `/quit` reaches an already-matching state
- **THEN** A1 SHALL preserve the pinned message or structured presentation rather than replace it with a generic success/failure sentence
- **AND** operation-specific silent completion or cancellation SHALL remain silent where pinned Pi is silent

### Requirement: Command messages preserve terminal geometry and lifetime
Command-result status, warning, error, named-session text, structured information, and new-session notices SHALL preserve pinned semantic styling, wrapping, output padding, blank rows, chronological placement, consecutive-status coalescing, and rendered-component lifetime at equivalent terminal dimensions and settings. Rendered-component lifetime governs message placement and replacement, not host-process termination or terminal shutdown. Multiline output SHALL occupy separately tracked rendered rows. The existing declared A1 viewport and settings replacements SHALL remain intact; parity SHALL compare message components and behavior within those declarations and the uncustomized pinned route independently.

#### Scenario: A command emits a long or multiline error
- **WHEN** the error text exceeds the available width or contains embedded newlines
- **THEN** A1 SHALL preserve Pi's error prefix, error color, configured output padding, wrapping, and spacer behavior without clipping unconditionally or embedding a newline in one rendered-row entry

#### Scenario: Output padding changes
- **WHEN** an error is rendered with output padding zero or one
- **THEN** its horizontal padding and wrap width SHALL follow pinned Pi's corresponding setting rather than an unconditional leading space

#### Scenario: A new session starts
- **WHEN** `/new` successfully starts a new session
- **THEN** the accent `✓ New session started` notice SHALL have the same surrounding blank rows and horizontal/vertical padding as pinned Pi

#### Scenario: Consecutive statuses are emitted
- **WHEN** multiple command statuses occur consecutively, or a warning/error or persistent message intervenes
- **THEN** A1 SHALL replace or append statuses at exactly the pinned boundaries without dropping intervening content or moving a message into another ownership region

#### Scenario: A terminal is resized after a command result
- **WHEN** the terminal narrows or widens with command-result content present and a selector opens or closes
- **THEN** all message rows, modal/editor relationships, focus restoration, and scroll accounting SHALL remain consistent with the pinned presentation outside declared A1 layout differences

### Requirement: Command-message parity has outcome-complete independent evidence
Command-message acceptance SHALL maintain a source-traced inventory of the currently supported Pi-compatible CLI operations and Pi-backed interactive command outcomes, recording each applicable message branch as matching, corrected, or an explicitly declared contextual exception. Independent pinned-Pi output SHALL establish expected transcripts and terminal cells; A1-authored expected strings alone SHALL NOT establish parity. Unsupported commands SHALL be recorded as outside the supported surface, not silently added to satisfy the inventory.

#### Scenario: Enumerate supported command outcomes
- **WHEN** coverage is prepared against the pinned source
- **THEN** it SHALL cover CLI model aliases, install/remove/uninstall/list/package-update commands and their diagnostics/help, and all existing supported interactive command routes including hidden routes
- **AND** each reachable message, no-message, empty, failure, progress, and cancellation branch SHALL identify its source and applicable acceptance case or declared exception

#### Scenario: Compare CLI transcripts
- **WHEN** equivalent isolated fixtures drive a covered CLI case
- **THEN** evidence SHALL compare stdout, stderr, literal content, line breaks, and color-enabled and color-disabled transcripts, with exit-status differences restricted to declared A1 syntax behavior
- **AND** operational data substitutions SHALL be named and narrow rather than globally stripping paths, whitespace, or styling

#### Scenario: Compare interactive message cells
- **WHEN** equivalent commands run through independent pinned and owned producers
- **THEN** evidence SHALL compare wording, severity, semantic ANSI styling, wrapping, padding, blank rows, placement, and status transitions at narrow and ordinary widths and both supported output-padding settings
- **AND** a plain-text match with different styling or geometry SHALL fail

#### Scenario: Missing or contradictory evidence
- **WHEN** a producer fails, a covered outcome lacks evidence, physical review contradicts an automated parity claim, or fatal-command evidence conflates matching output with process lifecycle parity
- **THEN** the affected command outcome SHALL remain unaccepted rather than being marked complete based on a success-only fixture or an undisclosed lifecycle difference
