## MODIFIED Requirements

### Requirement: Bare-A1 dialogs share one shortcut-hint presentation

Every shortcut-bearing modal, selector, dialog, nested flow, custom input/editor, confirmation, authentication surface, startup trust selector, extension-hosted modal, operation dialog, and owned full-screen dialog presented by bare A1 SHALL use the shared shortcut-row presentation. Full-screen dialogs include Settings and the shared Changelog/Hotkeys/Session Info reference screen. Effective shortcut labels SHALL continue to come from the bindings and platform rules used by the corresponding action, then use common display capitalization while action names remain lowercase, except that an A1-rendered entry which dismisses the active surface SHALL use the canonical display label and action `Esc close`. Applying the presentation SHALL NOT change focus, navigation, search, editing, save/confirm behavior, cancellation, operation abortion, viewport behavior, transitions, restoration, or disposal.

Every A1-rendered dismissible surface SHALL include exactly one `Esc close` entry as the final entry in its active standing or state-specific shortcut guidance. This requirement applies when dismissal silently closes a top-level surface, aborts an operation while closing its progress dialog, exits startup, or closes a nested state and restores its parent; those different outcomes SHALL NOT change the visible close wording. A surface that previously omitted dismissal guidance SHALL add the entry. Additional effective or implicit aliases SHALL remain undisclosed by this canonical entry. When available width can contain the complete entry, wrapping, clipping, state replacement, or optional controls SHALL NOT omit or partially clip `Esc close`; narrower rendering SHALL remain ANSI-safe. Escape uses outside active-surface dismissal, including ordinary editor autocomplete clearing, shell interruption, and non-dialog help, SHALL remain outside this wording rule.

Every such shortcut row SHALL begin at the same visible display column as its dialog's heading or title, retaining that surface's established heading inset rather than following its list-marker, form-field, editor, or content inset. A nested flow SHALL align to its own local heading. Wrapping or clipping SHALL preserve the surface's existing policy without introducing a second leading indent. The explicit `a1 pi` comparison profile SHALL retain its pinned dialog presentation. Ordinary shell help, status, transcript, and footer surfaces SHALL remain outside this dialog styling rule.

#### Scenario: Open a bare-A1 modal
- **WHEN** any shortcut-bearing bare-A1 modal node is presented
- **THEN** its instruction row SHALL show display-capitalized shortcut labels and lowercase action names in distinct semantic colors
- **AND** adjacent shortcut entries SHALL use whitespace without middle-dot or bullet separators
- **AND** the instruction row SHALL start at the same display column as the modal heading rather than the content rows
- **AND** its final dismissal entry SHALL read exactly `Esc close`

#### Scenario: Open a full-screen owned dialog
- **WHEN** Settings, Changelog, Hotkeys, or Session Info is presented as a full-screen owned route
- **THEN** its standing shortcut row SHALL use distinct key/action colors and whitespace-only entry gaps
- **AND** its first visible cell SHALL align with the full-screen title's established inset
- **AND** its final dismissal entry SHALL read exactly `Esc close`
- **AND** its frame, content, scrolling, search, and close behavior SHALL remain unchanged

#### Scenario: Open a nested or extension-hosted modal
- **WHEN** a modal flow replaces its parent with a nested confirmation, input, editor, authentication, or extension-hosted surface
- **THEN** every A1-rendered shortcut-bearing depth SHALL retain the same shared hint presentation
- **AND** each hint SHALL align with its local heading even when its input or editor uses a different content inset
- **AND** the active depth's final dismissal entry SHALL read exactly `Esc close`
- **AND** completing, cancelling, or returning SHALL preserve the existing transition and focus-restoration behavior

#### Scenario: Show a cancellable operation dialog
- **WHEN** bare A1 presents an operation progress dialog whose Escape path aborts the operation and closes the dialog
- **THEN** its dismissal guidance SHALL read exactly `Esc close`
- **AND** pressing Escape SHALL retain the operation's existing abort, result, teardown, and parent-restoration behavior

#### Scenario: Add omitted close guidance
- **WHEN** Session Tree, Resume Session, or another dismissible dialog previously rendered action guidance without its available close action
- **THEN** the guidance SHALL include exactly one final `Esc close` entry
- **AND** all existing action entries and their order before the close entry SHALL remain unchanged

#### Scenario: Keep close guidance visible
- **WHEN** a dismissible dialog has enough width to render the complete `Esc close` entry but its other shortcut guidance overflows
- **THEN** `Esc close` SHALL remain complete and visible
- **AND** the remaining entries SHALL follow that surface's established wrapping or clipping policy

#### Scenario: Keep content indentation independent
- **WHEN** a selector uses leading cells for an arrow, marker, field label, tree depth, or editor body
- **THEN** those content cells SHALL remain in their established columns
- **AND** the shortcut row SHALL align with the heading instead of inheriting the content indentation

#### Scenario: Resolve customized or platform-specific bindings
- **WHEN** a non-dismissal modal action has a customized binding, no effective binding, or a platform-specific display label
- **THEN** its hint SHALL use the same effective label and omission behavior as dispatch
- **AND** styling and alignment SHALL NOT manufacture a default key or change the invoked action
- **AND** the canonical `Esc close` entry SHALL NOT advertise additional effective or implicit close aliases

#### Scenario: Ask for project trust before resources load
- **WHEN** the pre-resource trust selector is presented
- **THEN** its fixed-color shortcut row SHALL provide the same distinct key/action roles, separator-free spacing, heading alignment, and final `Esc close` entry
- **AND** rendering it SHALL NOT load project settings, themes, extensions, packages, skills, or post-trust Pi components

#### Scenario: Preserve dismissal outcomes
- **WHEN** `Esc close` is shown for a top-level close, operation abort, startup exit, or nested return
- **THEN** pressing Escape SHALL retain that surface's existing cancellation, abortion, restoration, focus, and disposal outcome
- **AND** no selection, submission, save, or new generic cancellation message SHALL be introduced

#### Scenario: Use the comparison profile
- **WHEN** the same modal route is presented through `a1 pi`
- **THEN** its pinned shortcut presentation and geometry SHALL remain unchanged by the bare-A1 customization

#### Scenario: Audit dialog completeness
- **WHEN** modal inventory and owned full-screen route coverage run
- **THEN** every A1-rendered dismissible bare-A1 dialog node or route SHALL be mapped to the shared presentation or the isolated pre-resource equivalent
- **AND** a missing or non-final close entry, dismissal wording other than exact `Esc close`, duplicate close entry, heading/hint start-column mismatch, inconsistent key/action casing, whole-line single-color hint, or middle-dot/bullet entry separator SHALL fail coverage

### Requirement: Command outcome messages retain pinned wording and severity
Except for the named missing-GitHub-CLI diagnostic and bare-A1 share presentation below, every existing supported Pi-backed command SHALL reproduce pinned Pi's user-visible messages for equivalent success, failure, warning, empty, progress, and cancellation states. Parity SHALL include whether a message is emitted at all, its literal wording and punctuation, contextual prefixes, links, severity, and order. Existing declared A1 route replacements, the bare-A1 share presentation, and layout/progress customizations SHALL remain explicit exceptions only within their declared scope; they SHALL NOT justify changing unrelated command-result messages. Actual selected-profile paths and truthful runtime values SHALL remain contextual data, not copied values from another profile.

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

#### Scenario: Bare A1 starts sharing
- **WHEN** bare A1 begins creating a gist for `/share`
- **THEN** it SHALL replace the editor with a standard modal whose full-width top rule is followed immediately by the bold accent title `Share`
- **AND** the progress row and canonical close shortcut row SHALL use the modal's one-cell content inset
- **AND** the shortcut row SHALL align with the title, distinguish `Esc` from its `close` action using the shared dialog-hint style, and sit immediately above the full-width bottom rule with no intervening blank row
- **AND** Escape SHALL abort the active share operation while the existing Ctrl+C alias remains functional but undisclosed

#### Scenario: Share succeeds
- **WHEN** bare A1's `/share` successfully creates a secret gist
- **THEN** A1 SHALL close the share dialog and emit `Share URL: <viewer URL>` followed by `Gist: <gist URL>` with Pi's line break and ordering
- **AND** each URL value SHALL use the theme's blue web-link role and a bounded native hyperlink target while the surrounding labels retain their status presentation
- **AND** each URL SHALL have terminal-native dashed idle decoration, normal solid underline on hover, and SHALL open its exact target through the supported terminal's Ctrl+click interaction
- **AND** for the current pinned version the default viewer URL SHALL be `https://pi.dev/session/#<gist ID>` and a configured `PI_SHARE_VIEWER_URL` SHALL determine the base using pinned semantics

#### Scenario: Compare pinned share presentation
- **WHEN** `/share` is invoked through the `a1 pi` comparison profile
- **THEN** its loader, shortcut wording, spacing, and successful status presentation SHALL retain pinned Pi behavior rather than the bare-A1 share-dialog and link-style exceptions

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

### Requirement: Bare-A1 session naming supports direct and prompted entry

Bare A1 SHALL accept `/name <name>` as an immediate session-name update. When the user invokes `/name` without an argument, bare A1 SHALL present a compact single-line input instead of appending the usage warning or only reporting the current name. The input SHALL use the accent title `Session Name`, the standard focused text-entry row, and the shared `Enter submit` and `Esc close` shortcut hints.

Submitting a non-empty value SHALL apply it through the same session-name workflow as the direct command and SHALL report the resulting normalized name. Cancelling, or submitting only whitespace, SHALL restore the ordinary prompt without changing the session name or appending a warning, error, or completion message. The explicit `a1 pi` comparison profile SHALL retain its pinned argument-free `/name` behavior.

#### Scenario: Name a session directly
- **WHEN** the user invokes `/name Project Alpha` in bare A1
- **THEN** the session name SHALL be updated immediately through the existing naming workflow
- **AND** no name-input dialog SHALL open

#### Scenario: Open the name input
- **WHEN** the user invokes `/name` without an argument in bare A1
- **THEN** a compact input titled `Session Name` SHALL replace the ordinary prompt
- **AND** it SHALL show the shared `Enter submit` and `Esc close` shortcut hints
- **AND** no usage warning or current-name-only result SHALL be appended

#### Scenario: Submit a prompted name
- **WHEN** the user enters a non-empty name and presses Enter
- **THEN** the input SHALL close and the session SHALL use that name
- **AND** the ordinary normalized-name result SHALL be reported

#### Scenario: Cancel prompted naming
- **WHEN** the user presses Escape or submits only whitespace in the name input
- **THEN** the input SHALL close and restore the ordinary prompt
- **AND** the existing session name SHALL remain unchanged
- **AND** no command-result message SHALL be appended

#### Scenario: Use the comparison profile
- **WHEN** the user invokes argument-free `/name` in the explicit `a1 pi` comparison profile
- **THEN** the pinned comparison workflow SHALL remain unchanged

### Requirement: Bare-A1 Resume Session follows the standard dialog hierarchy

The bare-A1 Resume Session selector SHALL use the shared compact modal hierarchy of top rule, title, filter/status row, search and results, bottom shortcut footer, and bottom rule. Its full-width top and bottom rules SHALL use the same standard dialog border role as Session Tree and Models rather than the title accent role, including while rename mode is active. Its title SHALL be the standalone accent-bold text `Resume Session` and SHALL NOT repeat the active scope as `(Current Folder)` or `(All)`.

The row immediately below the title SHALL begin with `Filter: current | all`, followed by `Name: all` or `Name: named` and `Sort: threaded`, `Sort: recent`, or `Sort: fuzzy`. Labels, separators, and inactive scope values SHALL use the established inactive status styling; the active scope and current name and sort values SHALL use the accent role. Values SHALL use the specified lower-case display text. The row SHALL remain stable during asynchronous scope loading and SHALL NOT append `loading` or loader work-unit counts to either scope value.

When all-session discovery supplies partial results, the result list SHALL update incrementally. Whenever the existing paging indicator is applicable, its `(selection/total)` total SHALL count the currently discovered sessions that match the active query and name filter, and SHALL grow as further matching sessions arrive. It SHALL NOT label that count as loading or substitute loader work-unit progress for the visible matching-result total.

Every selected session result SHALL use the Session Tree's accent `→` arrow, accent primary title without selected-title bolding, muted path/count/age metadata, and subtle purple accent-tinted selection background. That background SHALL form one continuous full-width selection, regardless of the title or path length. When cwd or explicit path metadata is visible, every rendered row SHALL reserve a shared path column followed by separately aligned message-count and age columns. Session titles SHALL truncate before the path column with visible separation, and paths that exceed their bounded column SHALL truncate within that column rather than displacing the title, count, or age columns.

The selector's search-syntax and action shortcut hints SHALL appear below the session results, aligned to the same shared content inset as the title and status row. Every ordinary or state-specific footer SHALL end with the canonical `Esc close` entry, preserving it completely by clipping preceding guidance first when width is constrained. In the ordinary state the bottom rule SHALL immediately follow the final hint row. Delete confirmation, transient mutation status, and load errors SHALL use this bottom feedback area rather than replacing or joining the title/status rows. Existing search, scope switching, sorting, name filtering, path display, rename, deletion, selection, loading, cancellation, and result-list behavior SHALL remain available.

#### Scenario: Open Resume Session
- **WHEN** the user opens the bare-A1 Resume Session selector
- **THEN** the accent-bold title SHALL read `Resume Session` without a scope suffix
- **AND** the next row SHALL show `Filter: current | all`, the current lower-case `Name:` value, and the current lower-case `Sort:` value
- **AND** the active scope and current name and sort values SHALL use the accent role

#### Scenario: Render standard dialog rules
- **WHEN** Resume Session or its rename mode is visible
- **THEN** the full-width top and bottom rules SHALL use the standard dialog border role used by Session Tree and Models
- **AND** the rules SHALL remain visually distinct from the accent title

#### Scenario: Switch the session scope
- **WHEN** the user switches between current-folder and all-session scope
- **THEN** the title SHALL remain `Resume Session`
- **AND** the accent role SHALL move to the active `current` or `all` filter value
- **AND** the filter row SHALL NOT gain a `loading` phrase or loader work-unit count

#### Scenario: Grow the all-session result count during discovery
- **WHEN** all-session discovery delivers successive batches of matching sessions
- **THEN** the visible result list SHALL update with each batch
- **AND** the existing paging indicator's total SHALL grow to the current matching-session count when paging applies
- **AND** the paging indicator SHALL remain plain `(selection/total)` text without a loading label

#### Scenario: Align session result metadata
- **WHEN** visible results contain different title and path lengths
- **THEN** every visible path SHALL begin in the shared path column
- **AND** message counts and ages SHALL remain aligned in their own trailing columns
- **AND** long titles SHALL truncate before the path column with visible separation
- **AND** long paths SHALL truncate within the path column

#### Scenario: Highlight a complete session result row
- **WHEN** a session result is selected
- **THEN** it SHALL begin with the accent `→` arrow used by Session Tree
- **AND** its primary title SHALL use accent without selected-title bolding while path, count, and age remain muted
- **AND** the Session Tree's subtle purple accent-tinted selection background SHALL cover the complete available row width
- **AND** moving selection between rows with different title or path lengths SHALL NOT change the highlight width

#### Scenario: Change session name and sort filters
- **WHEN** the user changes the named-session filter or sort mode
- **THEN** the `Name:` and `Sort:` values on the row below the title SHALL update using lower-case display text
- **AND** the updated current values SHALL use the accent role

#### Scenario: Read Resume Session shortcuts
- **WHEN** the ordinary Resume Session selector is visible
- **THEN** its search-syntax and action shortcut rows SHALL appear below the session results
- **AND** the title, filter/status row, and shortcut rows SHALL share the standard modal content inset
- **AND** the final shortcut row SHALL end with `Esc close`
- **AND** the frame's bottom rule SHALL immediately follow the final shortcut row

#### Scenario: Confirm session deletion
- **WHEN** the user starts deletion of a selected session
- **THEN** the bottom feedback area SHALL replace ordinary shortcut hints with delete-confirm guidance followed by `Esc close`
- **AND** it SHALL NOT expose a cancel action or implicit Ctrl+C alias
- **AND** the title and filter/status rows SHALL remain in their standard positions

#### Scenario: Report session-selector status
- **WHEN** session loading fails or a session mutation reports transient success or failure
- **THEN** the message SHALL appear in the bottom feedback area before the final `Esc close` entry
- **AND** it SHALL NOT be appended to or replace the stable title and filter/status row

#### Scenario: Use existing session operations
- **WHEN** the user searches, changes scope, sorts, filters by name, toggles paths, renames, deletes, selects, or cancels
- **THEN** the operation SHALL retain its existing behavior while the standard modal hierarchy remains in place
