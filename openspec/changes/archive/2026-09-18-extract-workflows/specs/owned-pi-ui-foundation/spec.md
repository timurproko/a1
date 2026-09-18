## MODIFIED Requirements

### Requirement: Command outcome messages retain pinned wording and severity
Except for the named missing-GitHub-CLI diagnostic below, every existing supported Pi-backed command SHALL reproduce pinned Pi's user-visible messages for equivalent success, failure, warning, empty, progress, and cancellation states. Parity SHALL include whether a message is emitted at all, its literal wording and punctuation, contextual prefixes, links, severity, and order. Existing declared A1 route replacements and layout/progress customizations SHALL remain explicit exceptions only within their declared scope; they SHALL NOT justify changing unrelated command-result messages. Actual selected-profile paths and truthful runtime values SHALL remain contextual data, not copied values from another profile.

For fatal `/new`, `/resume`, and `/import` outcomes, A1 SHALL preserve Pi-compatible visible error semantics but SHALL retain its recoverable workflow/session contract: the route returns a failed result and the owning A1 session remains active rather than stopping the terminal or propagating Pi's process exit. This lifecycle difference SHALL be recorded as an explicit contextual exception and SHALL NOT be presented as process-behavior parity.

The slash-command workflows that produce these messages, their admission and cancellation, provider authentication, and the selector contexts the owned dialogs read SHALL be adapter-owned workflow components testable without the engine: a runner and a contexts reader that reach the current session, runtime, model state, view publication, and the interaction host only through explicit ports, while the adapter alone decides which session is current and when work is refused.

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

#### Scenario: Share cannot find the GitHub CLI
- **WHEN** the user invokes `/share` and the `gh` executable is missing or cannot be found on PATH
- **THEN** A1 SHALL display error-colored `Error: GitHub CLI (gh) is not installed. Install it from https://cli.github.com/`
- **AND** sharing SHALL stop before session export or gist creation, without a success link, while the current session remains usable
- **AND** this SHALL be a named wording exception to Pi 0.84.2's misleading `Error: GitHub CLI is not logged in. Run 'gh auth login' first.` for a missing executable, not a claim of identical output
- **AND** the exception SHALL NOT change error styling, padding, wrapping rules, or any other command outcome, and SHALL NOT apply to permission or other non-missing-executable failures

#### Scenario: Share finds an unauthenticated GitHub CLI
- **WHEN** the user invokes `/share`, `gh` is installed and found, but its authentication check fails
- **THEN** A1 SHALL display error-colored `Error: GitHub CLI is not logged in. Run 'gh auth login' first.` exactly as pinned Pi does
- **AND** sharing SHALL stop before session export or gist creation, without a success link, while the current session remains usable
- **AND** A1 SHALL NOT substitute the missing-executable installation message

#### Scenario: Share fails or is cancelled
- **WHEN** session export fails, gist creation fails, or the user cancels creation
- **THEN** A1 SHALL retain Pi's export/gist error context or `Share cancelled` status as applicable
- **AND** no success link SHALL be emitted on failure or cancellation

#### Scenario: Existing matching commands complete
- **WHEN** `/copy`, `/export`, `/name`, `/session`, `/hotkeys`, `/changelog`, `/model`, `/scoped-models`, `/tree`, `/trust`, `/resume`, `/reload`, `/new`, `/compact`, or `/quit` reaches an already-matching state
- **THEN** A1 SHALL preserve the pinned message or structured presentation rather than replace it with a generic success/failure sentence
- **AND** operation-specific silent completion or cancellation SHALL remain silent where pinned Pi is silent

#### Scenario: Run a workflow without an engine
- **WHEN** the workflow runner is driven directly with a fake session, runtime, and interaction host
- **THEN** it SHALL refuse work while admission is stopped or the shared budget is spent, track and cancel admitted workflows except `/quit`, and produce the same per-command wording, clipboard acknowledgment, model cycling, and login completion the shell observes through the adapter
- **AND** the contexts reader SHALL shape the same provider, model, fork, tree, scoped-model, and session selector state from the same session and settings
