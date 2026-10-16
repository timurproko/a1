## MODIFIED Requirements

### Requirement: The owned shell presents the complete pinned Pi interactive UI
The A1-owned UI SHALL reproduce the complete visible and interactive behavior of pinned Pi `1.3.0` at commit `71023aec1546d6d677a65669c5665c0927ce0dd0`. The baseline SHALL include startup composition, themes, colors, spacing, layout, editor, autocomplete, keybindings, commands, prompt execution, transcript, streaming, tools, selectors, dialogs, settings, sessions, models, thinking, status/footer state, clipboard, resize, errors, and shutdown. A1 SHALL NOT substitute approximate layouts, colors, controllers, or workflows for covered pinned behavior. After parity acceptance a route MAY be superseded by a declared A1-owned replacement; the pinned behavior of a superseded route SHALL remain provable through `a1 pi`, and every capability the pinned route exposed SHALL remain reachable from its replacement.

#### Scenario: Start an owned Pi session
- **WHEN** the user starts the owned UI in an equivalent terminal and session state
- **THEN** the visible component tree, content, theme, spacing, focus, and available interactions SHALL match pinned Pi for that state

#### Scenario: Submit an ordinary prompt
- **WHEN** the user submits a non-command prompt against a configured model
- **THEN** the prompt SHALL become visible, the agent SHALL execute, assistant and tool activity SHALL stream in order, failures SHALL be visible, and the turn SHALL settle exactly as in pinned Pi

#### Scenario: Encounter an unmapped pinned behavior
- **WHEN** a visible pinned interactive behavior has no A1 implementation or an A1 approximation behaves differently
- **THEN** the 1:1 baseline gate SHALL fail and the owned UI SHALL remain unaccepted

#### Scenario: Change editor input mode
- **WHEN** the active thinking level changes or editor input enters or leaves pinned bash mode
- **THEN** the editor border color SHALL update through the pinned thinking-level or bash-mode color mapping with the same invalidation timing as pinned Pi

#### Scenario: Settle a completed agent turn
- **WHEN** an agent turn finishes and its settlement event omits, replaces, or supplies the authoritative message collection
- **THEN** every finalized visible user, assistant, thinking, and tool surface SHALL remain present and SHALL reconcile from pinned session-authoritative state rather than disappearing

#### Scenario: Render footer usage
- **WHEN** the session has model usage, cache activity, cost, context usage, compaction state, provider state, branch, session name, or extension statuses
- **THEN** the footer SHALL compute, format, color, truncate, and align those values exactly as pinned `FooterComponent` rather than showing placeholder statistics

#### Scenario: Open settings
- **WHEN** the user invokes `/settings` in bare A1
- **THEN** the declared A1-owned settings app SHALL open as the replacement for the pinned settings route, and every agent setting the pinned selector exposed SHALL remain reachable there and editable wherever the engine advertises settings write capability
- **AND** the pinned specialized settings selector with its current values, descriptions, search, instructions, nested flows, navigation, cancellation, change callbacks, focus restoration, and resize behavior SHALL remain the behavior proven through `a1 pi`
- **AND** neither surface SHALL expose internal callback names as settings values

#### Scenario: Show keyboard shortcuts
- **WHEN** the user invokes `/hotkeys`
- **THEN** the owned UI SHALL append the complete pinned keybinding-derived heading and styled Markdown tables with equivalent categories, keys, descriptions, spacing, wrapping, scrolling, colors, and transcript behavior rather than an abbreviated text summary

#### Scenario: Render consecutive Markdown content
- **WHEN** an assistant message contains consecutive list rows, paragraphs, links, code, or other Markdown with a fixed source payload
- **THEN** the owned UI SHALL preserve the pinned ordered content array, Markdown transform, theme, padding, and vertical-spacing rules and SHALL NOT introduce blank rows that untouched pinned Pi does not render

#### Scenario: Render mixed assistant content
- **WHEN** one assistant message interleaves thinking, text, and tool calls or settles with a stop, error, or abort state
- **THEN** the owned UI SHALL preserve source order, streaming state, component identity, adjacent-content spacing, tool boundaries, and terminal status content exactly as pinned `AssistantMessageComponent`

#### Scenario: Use vanilla regular-mode terminal ownership
- **WHEN** the user starts A1 without explicitly selecting fullscreen mode and no A1-owned application is presented
- **THEN** the runtime SHALL use public `TuiMainScreen` in `regular` mode exactly as default vanilla Pi does
- **AND** it SHALL NOT enter the alternate screen, enable mouse tracking, intercept drag/release events, rewrite selected ANSI cells, synthesize clipboard output, or maintain screen-coordinate selection state

#### Scenario: Present an A1-owned application over regular mode
- **WHEN** a declared A1-owned application is presented in regular mode
- **THEN** A1 MAY enable mouse reporting for the lifetime of that application, because pointer hover, click, and drag are how such a screen is operated
- **AND** it SHALL disable reporting and restore the terminal exactly as it was found when the application closes, including when it closes through a failure
- **AND** it SHALL still not enter the alternate screen, rewrite selected ANSI cells, synthesize clipboard output, or maintain screen-coordinate selection state
- **AND** reporting SHALL never be enabled while no A1-owned application is presented, so `a1 pi` and every pinned surface are unaffected

#### Scenario: Select, copy, and scroll in regular mode
- **WHEN** the user selects character, word, line, or multi-row content, presses `Ctrl+C` with or without a terminal selection, scrolls the wheel, or types `/` after selecting text
- **THEN** the physical terminal SHALL own selection appearance, selection clearing, selected-copy consumption, wheel movement, and scrollback exactly as it does for untouched default vanilla Pi
- **AND** A1-rendered source colors or newly opened command/modal content SHALL NOT inherit an application-owned selection because no such selection layer exists

#### Scenario: Explicitly use fullscreen mode
- **WHEN** the user explicitly configures `tuiMode` as `fullscreen`
- **THEN** A1 SHALL use public `TuiAltScreen` and its pinned application-owned viewport, selection, copy, wheel, nested-scroll, and restoration behavior without A1 ANSI rewriting or input interception

#### Scenario: Render the changelog command
- **WHEN** the user invokes `/changelog`
- **THEN** the owned UI SHALL insert the pinned spacer, dynamic borders, bold accent `What's New` heading, spacing, settings-aware Markdown component, padding, wrapping, scrolling, and chronological transcript placement
- **AND** raw Markdown markers or a generic `✓ What's New` workflow row SHALL NOT be displayed as the command presentation

#### Scenario: Render a built-in command failure
- **WHEN** a built-in route fails, including `/export` before a conversation exists
- **THEN** the owned UI SHALL use pinned `showError()` spacing, output padding, error color, and `Error:` prefix at the pinned transcript position
- **AND** the route SHALL preserve its pinned contextual message, including `Failed to export session: Nothing to export yet - start a conversation first`

#### Scenario: Render a built-in informational status
- **WHEN** a built-in route reports status, including successful `/reload`
- **THEN** the owned UI SHALL use pinned `showStatus()` spacer, dim styling, chronological placement, and consecutive-status coalescing
- **AND** `/reload` SHALL NOT gain an A1-only checkmark or generic success prefix

#### Scenario: Show loaded startup resources
- **WHEN** pinned Pi discovers context files, skills, prompt templates, extensions, custom themes, or resource diagnostics during startup
- **THEN** the owned UI SHALL render the equivalent Context, Skills, Prompts, Extensions, Themes, and conflict sections with pinned grouping, sorting, labels, colors, spacing, compact/expanded state, and source formatting before initial session messages

#### Scenario: Preserve loaded resources across a chat clear
- **WHEN** the transcript is cleared or a fresh chat state is rendered without rebinding resources
- **THEN** the loaded-resource sections SHALL remain in their separate pinned root container and SHALL NOT disappear with chat transcript rows

#### Scenario: Compose a specialized selector
- **WHEN** settings or another pinned specialized selector is active over a populated transcript
- **THEN** its root-container placement, editor replacement, focus, viewport allocation, scrolling, instruction rows, footer relationship, cancellation, and restoration SHALL match pinned Pi rather than generic overlay composition

#### Scenario: Cancel a selector silently
- **WHEN** the user presses Escape or invokes cancel while a built-in selector or modal is active
- **THEN** the surface SHALL be disposed and the editor and focus SHALL be restored without appending a generic `{surface} cancelled` transcript, workflow, notification, or status row
- **AND** operation-specific cancellation output SHALL appear only where the pinned controller explicitly emits it

#### Scenario: Exercise any vanilla modal surface
- **WHEN** any modal, selector, dialog, nested flow, custom input/editor, confirmation, authentication surface, or extension-hosted modal reachable in pinned Pi is opened
- **THEN** A1 SHALL use the equivalent stateful component and controller lifecycle rather than a generic one-shot workflow substitution
- **AND** active interaction, navigation, search, editing, save/confirm behavior, cancellation, nesting/replacement, status and transcript effects, scrolling, resize, focus restoration, failure handling, session switching, and disposal SHALL match the pinned route

#### Scenario: Configure scoped models
- **WHEN** the user invokes `/scoped-models` and toggles, filters, bulk-enables, clears, changes a provider, or reorders models
- **THEN** the stateful scoped-model selector SHALL remain open, update session-only scope and dirty/unsaved state, and preserve pinned model ordering and refresh behavior
- **AND WHEN** the user presses `Ctrl+S`
- **THEN** the current patterns SHALL persist to settings, the saved status SHALL appear as in pinned Pi, and the selector SHALL remain active
- **AND WHEN** the user presses Escape
- **THEN** the selector SHALL close silently while retaining the already-applied session-only scope and without implicitly persisting unsaved settings

#### Scenario: Prove complete modal inventory coverage
- **WHEN** source coverage or acceptance runs
- **THEN** every modal-like branch discovered from pinned `InteractiveMode`, nested settings components, and public extension UI SHALL have a mapped A1 controller and independent open/active/complete-or-save/cancel/failure/restoration acceptance cases
- **AND** an omitted branch or a route covered only by a shared generic-selector fixture SHALL fail the gate

#### Scenario: Browse current-session prompt history
- **WHEN** the current session contains previously entered user messages and the editor receives Up or Down at a pinned history-navigation boundary
- **THEN** the editor SHALL browse those messages in pinned newest/oldest order, suppress adjacent duplicates, preserve multiline cursor movement outside those boundaries, and restore the pre-navigation draft when leaving history browsing
- **AND** newly accepted ordinary, streaming, extension, bash, steering, and follow-up inputs SHALL enter history at the same source-traced controller points as pinned Pi

#### Scenario: Render structured built-in command content
- **WHEN** a built-in command presents structured information, including `/session`
- **THEN** the owned UI SHALL reproduce vanilla Pi's complete headings, groups, labels, values, colors, emphasis, indentation, wrapping, spacing, and scrolling for that route
- **AND** it SHALL NOT replace the route-specific presenter with raw JSON, a plain object dump, a generic success heading, an A1-only checkmark, or flattened plain text

#### Scenario: Preserve visible-content ownership planes
- **WHEN** pinned Pi presents persistent document content, prompt-adjacent transient content, or active replacement content
- **THEN** A1 SHALL place the content in the equivalent root region with the same sibling order, vertical spacing, style, width, scroll/follow effect, replacement behavior, and lifetime
- **AND** correct text rendered in a different transcript, workflow, status, editor, footer, or modal region SHALL fail parity

#### Scenario: Position the working indicator
- **WHEN** the agent or an extension enters, updates, or leaves a working state
- **THEN** the working indicator SHALL appear at the same prompt-relative location with equivalent icon, text, color, blank rows, replacement behavior, and editor/footer relationship as vanilla Pi

#### Scenario: Report program status to a supporting terminal
- **WHEN** the session starts or settles work, opens or closes a dialog or authentication flow, fails, is aborted, switches session, or stops
- **THEN** A1 SHALL report the equivalent pinned idle, working, blocked, done, error, or clear state through Pi TUI's OSC 7501 terminal contract
- **AND** status messages SHALL be limited to the session name, dialog title, or first error line and SHALL NOT expose prompt or assistant content

#### Scenario: Render a multiline prompt-adjacent status before a modal
- **WHEN** a status contains multiple visual lines, including the `Share URL` and `Gist` result, and an editor-replacement modal is subsequently opened or closed in regular mode
- **THEN** every visual line SHALL be a separate tracked component row with pinned one-cell output padding, wrapping, styling, and order
- **AND** the physical terminal row count SHALL remain synchronized with `TuiMainScreen` so the modal and footer occupy the same source-derived rows as untouched Pi
- **AND** no component render-array entry SHALL contain an embedded newline that bypasses TUI row accounting

#### Scenario: Order prompt-adjacent messages
- **WHEN** informational, status, warning, error, notification, queue, retry, compaction, or extension messages are produced consecutively or interleaved with persistent content
- **THEN** each message SHALL use its pinned style and spacing, and the newest active message SHALL occupy the pinned position closest to the editor
- **AND** coalescing, replacement, removal, scrolling, and transition back to the ordinary editor SHALL preserve the pinned chronological order

#### Scenario: Place command information and errors near the prompt
- **WHEN** a command emits a current informational result or failure
- **THEN** A1 SHALL render it in the same prompt-adjacent or persistent region selected by vanilla Pi for that exact route, with the same prefix, context, style, spacing, and bottom relationship
- **AND** A1 SHALL NOT place a prompt-adjacent error in an earlier content bucket or leave a large unpinned gap below it

#### Scenario: Traverse a nested dialog path
- **WHEN** a user moves from any top-level selector or dialog into a deeper selector, input, confirmation, authentication method, API-key, browser/device/OAuth, error, or completion state
- **THEN** every depth SHALL reproduce vanilla Pi's heading, body, options, descriptions, borders, colors, instruction hints, focus, selection, scrolling, viewport, and input behavior
- **AND** each completion, cancellation, back, failure, session-switch, and disposal transition SHALL restore the exact pinned parent surface or ordinary editor state
- **AND** a generic text input or selector that merely returns an equivalent value SHALL NOT satisfy the nested route

#### Scenario: Prove the complete modal transition graph
- **WHEN** source coverage or parity acceptance runs
- **THEN** every source-reachable built-in and extension modal node and every transition edge SHALL have a mapped specialized controller and independent pinned-versus-A1 evidence
- **AND** removing a nested node, transition, style, instruction, ownership region, or restoration edge SHALL make the gate fail
- **AND** top-level open/cancel snapshots alone SHALL NOT establish modal completeness

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

#### Scenario: Share destination selects the upload route
- **WHEN** the user invokes `/share`
- **THEN** A1 SHALL read the pinned `sessionShareDestination` setting for that run and SHALL offer it as Pi's `Session share destination` row with `auto`, `gist`, and `radius` choices
- **AND** `auto` SHALL upload to Radius when the model runtime has a Radius provider and credential and SHALL otherwise create a gist, `gist` SHALL always create a gist, and `radius` SHALL stop with error-colored `Error: Radius authentication is not configured. Run '/login radius' first.` when Radius is unavailable
- **AND** a Radius upload that starts and then fails SHALL NOT fall back to a gist

#### Scenario: Bare A1 starts sharing
- **WHEN** bare A1 begins a `/share` upload
- **THEN** it SHALL replace the editor with a standard modal whose full-width top rule is followed immediately by the bold accent title `Share`
- **AND** its progress row SHALL read `Uploading to Radius…` while uploading to Radius and `Creating gist…` while creating a gist
- **AND** the progress row and canonical close shortcut row SHALL use the modal's one-cell content inset
- **AND** the shortcut row SHALL align with the title, distinguish `Esc` from its `close` action using the shared dialog-hint style, and sit immediately above the full-width bottom rule with no intervening blank row
- **AND** Escape SHALL abort the active share operation while the existing Ctrl+C alias remains functional but undisclosed

#### Scenario: Share succeeds
- **WHEN** bare A1's `/share` successfully creates a secret gist
- **THEN** A1 SHALL close the share dialog and emit `Share URL: <viewer URL>` followed by `Gist: <gist URL>` with Pi's line break and ordering
- **AND** each URL value SHALL use the theme's blue web-link role and a bounded native hyperlink target while the surrounding labels retain their status presentation
- **AND** each URL SHALL have terminal-native dashed idle decoration, normal solid underline on hover, and SHALL open its exact target through the supported terminal's Ctrl+click interaction
- **AND** for the current pinned version the default viewer URL SHALL be `https://pi.dev/session/#<gist ID>` and a configured `PI_SHARE_VIEWER_URL` SHALL determine the base using pinned semantics

#### Scenario: Share uploads to Radius
- **WHEN** `/share` uploads to Radius
- **THEN** A1 SHALL post the current branch as JSONL with Pi's trailing `pi.share` entry carrying the system prompt and tool schemas to the pinned Radius gateway's artifacts endpoint with organization visibility and the title `Pi session`
- **AND** on success A1 SHALL close the share dialog and emit only `Share URL: <artifact URL>` with the same link presentation as a gist share

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
- **WHEN** session export fails, gist creation or Radius upload fails, or the user cancels the upload
- **THEN** A1 SHALL retain Pi's export, gist, or `Failed to upload Radius artifact: <detail>` error context or `Share cancelled` status as applicable
- **AND** no success link SHALL be emitted on failure or cancellation

#### Scenario: Existing matching commands complete
- **WHEN** `/copy`, `/export`, `/name`, `/session`, `/hotkeys`, `/changelog`, `/model`, `/scoped-models`, `/tree`, `/trust`, `/resume`, `/reload`, `/new`, `/compact`, or `/quit` reaches an already-matching state
- **THEN** A1 SHALL preserve the pinned message or structured presentation rather than replace it with a generic success/failure sentence
- **AND** operation-specific silent completion or cancellation SHALL remain silent where pinned Pi is silent

#### Scenario: Run a workflow without an engine
- **WHEN** the workflow runner is driven directly with a fake session, runtime, and interaction host
- **THEN** it SHALL refuse work while admission is stopped or the shared budget is spent, track and cancel admitted workflows except `/quit`, and produce the same per-command wording, clipboard acknowledgment, model cycling, and login completion the shell observes through the adapter
- **AND** the contexts reader SHALL shape the same provider, model, fork, tree, scoped-model, and session selector state from the same session and settings
