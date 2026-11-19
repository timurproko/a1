## ADDED Requirements

### Requirement: The owned shell reproduces pinned Pi interactive behavior outside declared A1 replacements
The A1-owned UI SHALL reproduce the visible and interactive behavior of the pinned Pi version. The baseline SHALL include startup composition, themes, colors, spacing, layout, editor, autocomplete, keybindings, commands, prompt execution, transcript, streaming, tools, selectors, dialogs, settings, sessions, models, thinking, status/footer state, clipboard, resize, errors, and shutdown. The `a1 pi` comparison profile SHALL present that behavior without A1-owned surfaces. Bare A1 SHALL present the same behavior except where a requirement of this capability or of a more specific capability specifies an A1-owned addition or replacement; every capability a replaced pinned route exposed SHALL remain reachable from its replacement. A1 SHALL NOT substitute approximate layouts, colors, controllers, or workflows for pinned behavior that no such requirement replaces.

#### Scenario: Recover a session whose working directory is gone
- **WHEN** startup selection, resume, import, or an extension-triggered switch encounters a session whose original working directory no longer exists
- **THEN** the owned UI SHALL expose pinned Continue, Fork, and Cancel choices with equivalent presentation and restoration behavior
- **AND** Continue SHALL use the current directory without persisting that choice, Fork SHALL create a new session identity in the current directory, and Cancel SHALL leave the active session unchanged
- **AND** cancelled or failed import recovery SHALL NOT leave duplicate imported files with the same session identity
- **AND** recovery SHALL preserve A1's session-writer exclusion and existing cross-project selection policy

#### Scenario: Start an owned Pi session
- **WHEN** the user starts the `a1 pi` comparison profile in an equivalent terminal and session state
- **THEN** the visible component tree, content, theme, spacing, focus, and available interactions SHALL match pinned Pi for that state

#### Scenario: Submit an ordinary prompt
- **WHEN** the user submits a non-command prompt against a configured model
- **THEN** the prompt SHALL become visible, the agent SHALL execute, assistant and tool activity SHALL stream in order, failures SHALL be visible, and the turn SHALL settle exactly as in pinned Pi

#### Scenario: Change editor input mode in the comparison profile
- **WHEN** the `a1 pi` comparison profile is running and the active thinking level changes or editor input enters or leaves pinned bash mode
- **THEN** the editor border color SHALL update through the pinned thinking-level or bash-mode color mapping with the same invalidation timing as pinned Pi

#### Scenario: Settle a completed agent turn
- **WHEN** an agent turn finishes and its settlement event omits, replaces, or supplies the authoritative message collection
- **THEN** every finalized visible user, assistant, thinking, and tool surface SHALL remain present and SHALL reconcile from pinned session-authoritative state rather than disappearing

#### Scenario: Render footer usage
- **WHEN** the session has model usage, cache activity, cost, context usage, compaction state, provider state, branch, session name, or extension statuses
- **THEN** the footer SHALL compute, format, color, truncate, and align those values exactly as pinned `FooterComponent` rather than showing placeholder statistics

#### Scenario: Open settings
- **WHEN** the user opens Settings from the Launcher in bare A1
- **THEN** the A1-owned settings app SHALL open as the replacement for the pinned settings route, and every agent setting the pinned selector exposed SHALL remain reachable there and editable wherever the engine advertises settings write capability
- **AND** bare A1 SHALL NOT offer `/settings` as a built-in Agent command
- **AND** `/settings` in the `a1 pi` comparison profile SHALL open the pinned specialized settings selector with its current values, descriptions, search, instructions, nested flows, navigation, cancellation, change callbacks, focus restoration, and resize behavior
- **AND** neither surface SHALL expose internal callback names as settings values

#### Scenario: Show keyboard shortcuts in the comparison profile
- **WHEN** the user invokes `/hotkeys` in the `a1 pi` comparison profile
- **THEN** the owned UI SHALL append the complete pinned keybinding-derived heading and styled Markdown tables with equivalent categories, keys, descriptions, spacing, wrapping, scrolling, colors, and transcript behavior rather than an abbreviated text summary

#### Scenario: Render consecutive Markdown content
- **WHEN** an assistant message contains consecutive list rows, paragraphs, links, code, or other Markdown with a fixed source payload
- **THEN** the owned UI SHALL preserve the pinned ordered content array, Markdown transform, theme, padding, and vertical-spacing rules and SHALL NOT introduce blank rows that untouched pinned Pi does not render

#### Scenario: Render mixed assistant content
- **WHEN** one assistant message interleaves thinking, text, and tool calls or settles with a stop, error, or abort state
- **THEN** the owned UI SHALL preserve source order, streaming state, component identity, adjacent-content spacing, tool boundaries, and terminal status content exactly as pinned `AssistantMessageComponent`

#### Scenario: Use regular-mode terminal ownership in the comparison profile
- **WHEN** the user starts `a1 pi` and the profile's `tuiMode` setting is not `fullscreen`
- **THEN** the runtime SHALL use public `TuiMainScreen` in `regular` mode exactly as default vanilla Pi does
- **AND** it SHALL NOT enter the alternate screen, enable mouse tracking, intercept drag/release events, rewrite selected ANSI cells, synthesize clipboard output, or maintain screen-coordinate selection state

#### Scenario: Select, copy, and scroll in comparison regular mode
- **WHEN** `a1 pi` runs in regular mode and the user selects character, word, line, or multi-row content, presses `Ctrl+C` with or without a terminal selection, scrolls the wheel, or types `/` after selecting text
- **THEN** the physical terminal SHALL own selection appearance, selection clearing, selected-copy consumption, wheel movement, and scrollback exactly as it does for untouched default vanilla Pi
- **AND** A1-rendered source colors or newly opened command/modal content SHALL NOT inherit an application-owned selection because no such selection layer exists

#### Scenario: Use fullscreen mode in the comparison profile
- **WHEN** the user starts `a1 pi` and the profile's `tuiMode` setting is `fullscreen`
- **THEN** A1 SHALL use public `TuiAltScreen` and its pinned application-owned viewport, selection, copy, wheel, nested-scroll, and restoration behavior without A1 ANSI rewriting or input interception

#### Scenario: Render the changelog command in the comparison profile
- **WHEN** the user invokes `/changelog` in the `a1 pi` comparison profile
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

#### Scenario: Configure scoped models in the comparison profile
- **WHEN** the user invokes `/scoped-models` in the `a1 pi` comparison profile and toggles, filters, bulk-enables, clears, changes a provider, or reorders models
- **THEN** the stateful scoped-model selector SHALL remain open, update session-only scope and dirty/unsaved state, and preserve pinned model ordering and refresh behavior
- **AND WHEN** the user presses `Ctrl+S`
- **THEN** the current patterns SHALL persist to settings, the saved status SHALL appear as in pinned Pi, and the selector SHALL remain active
- **AND WHEN** the user presses Escape
- **THEN** the selector SHALL close silently while retaining the already-applied session-only scope and without implicitly persisting unsaved settings

#### Scenario: Browse current-session prompt history
- **WHEN** persistent prompt history is not active (the `a1 pi` comparison profile, or bare A1 with history persistence disabled), the current session contains previously entered user messages and the editor receives Up or Down at a pinned history-navigation boundary
- **THEN** the editor SHALL browse those messages in pinned newest/oldest order, suppress adjacent duplicates, preserve multiline cursor movement outside those boundaries, and restore the pre-navigation draft when leaving history browsing
- **AND** newly accepted ordinary, streaming, extension, bash, steering, and follow-up inputs SHALL enter history at the same source-traced controller points as pinned Pi

#### Scenario: Render structured built-in command content
- **WHEN** a built-in command presents structured information, including `/session` in the `a1 pi` comparison profile
- **THEN** the owned UI SHALL reproduce vanilla Pi's complete headings, groups, labels, values, colors, emphasis, indentation, wrapping, spacing, and scrolling for that route
- **AND** it SHALL NOT replace the route-specific presenter with raw JSON, a plain object dump, a generic success heading, an A1-only checkmark, or flattened plain text

#### Scenario: Preserve visible-content ownership planes
- **WHEN** pinned Pi presents persistent document content, prompt-adjacent transient content, or active replacement content
- **THEN** A1 SHALL place the content in the equivalent root region with the same sibling order, vertical spacing, style, width, scroll/follow effect, replacement behavior, and lifetime
- **AND** correct text SHALL NOT be rendered in a different transcript, workflow, status, editor, footer, or modal region

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

### Requirement: Visible Pi extension UI crosses A1-owned boundaries
The owned UI SHALL support the visible behavior exposed by pinned Pi extensions, including widgets, custom editors and inputs, selectors, dialogs, notifications, status and footer contributions, custom message and tool renderers, terminal input hooks, working indicators, and lifecycle cleanup. Extension UI behavior SHALL cross A1-owned versioned boundaries and SHALL NOT require mutation of installed Pi code or private interactive state.

#### Scenario: Extension contributes a visible surface
- **WHEN** a compatible pinned Pi extension registers a supported visible contribution
- **THEN** the owned UI SHALL present and update that contribution with equivalent focus, input, rendering, cancellation, and cleanup behavior

#### Scenario: Extension dialogs overlap
- **WHEN** an extension opens a select, confirm, input, editor, or inline custom dialog while another extension dialog is visible
- **THEN** the new dialog SHALL cover the visible one, and every covered dialog SHALL remain answerable
- **AND** closing the visible dialog SHALL show and focus the previous dialog with its program status, or the editor when none remains
- **AND** a session reset SHALL settle every stacked dialog as cancelled rather than leaving its promise pending

#### Scenario: Extension surface fails
- **WHEN** one extension renderer, input handler, or lifecycle callback throws or returns malformed data
- **THEN** A1 SHALL isolate the failure, restore the baseline editor and focus, report the error, and preserve the rest of the session

### Requirement: Provider authentication state determines model availability
The owned Pi UI SHALL derive visible provider configuration, available models, active model selection, footer state, login/logout choices, and restart recovery from the same authoritative provider-auth state pinned Pi uses for the selected profile. Models SHALL be selectable only when their provider is currently configured according to that authority. Persisted credentials SHALL remain profile-local and SHALL count as an authenticated state across launches until logout or invalidation; an empty profile SHALL NOT inherit models or credentials from another profile, settings history, a prior process, or a cached catalog.

#### Scenario: Start with an empty A1 profile
- **WHEN** bare A1 starts with no stored, environment, runtime, or provider-config authentication and no equivalent configured provider
- **THEN** it SHALL report that no models are available, `/models` SHALL contain no selectable provider models, `/login` SHALL show providers as unconfigured, and the footer SHALL NOT present a stale active model

#### Scenario: Start with stored credentials
- **WHEN** bare A1 starts with valid credentials stored in its own profile for one or more providers
- **THEN** `/login` SHALL identify those providers with the same configured type and source status as pinned Pi, `/models` SHALL expose only models from currently configured providers, and selected-model and footer state SHALL agree with that catalog

#### Scenario: Keep A1 and vanilla profiles isolated
- **WHEN** `~/.a1/agent` and `~/.pi/agent` contain different authentication records
- **THEN** bare `a1` and `a1 pi` SHALL each use only its selected profile and SHALL NOT copy or silently share credentials between profiles

#### Scenario: Complete provider login
- **WHEN** login succeeds for a provider
- **THEN** provider status, logout availability, model availability, active selection, and footer state SHALL update to the same observable state and ordering as pinned Pi without requiring a process restart

#### Scenario: Remove stored credentials
- **WHEN** logout removes a stored OAuth or API-key credential
- **THEN** the provider and its models SHALL cease to appear configured unless another declared authentication source remains, stale settings SHALL NOT preserve an unusable active model, and environment or provider-config authentication SHALL remain untouched as pinned Pi specifies

#### Scenario: Resolve non-stored provider configuration
- **WHEN** a provider is configured through a supported environment, runtime, or provider-config source rather than stored credentials
- **THEN** login status and model availability SHALL reflect the source-equivalent pinned-Pi state, while logout SHALL NOT claim to remove authentication it does not own

#### Scenario: Refresh or credential validation fails
- **WHEN** credential refresh, provider discovery, or model-catalog refresh fails or times out
- **THEN** A1 SHALL preserve only the last still-authoritative provider state, report the bounded failure as pinned Pi does, and SHALL NOT broaden model availability from all-model catalogs or stale settings

#### Scenario: Restart after authentication changes
- **WHEN** A1 restarts after login, logout, expiry, refresh, or selected-model changes
- **THEN** provider labels, model choices, selected model, warnings, and footer state SHALL reconstruct one mutually consistent state without reviving unauthenticated models

### Requirement: The history-enabled default editor is an owned typed adaptation
The history-enabled default editor adaptation SHALL be traceable to the selected pinned editor source and only the necessary editor-local helper closure, with license attribution and reviewed modifications. Its history synchronization and navigation SHALL use owned typed operations that preserve draft, cursor, paste backing, and undo semantics, rather than access Pi's private state, patch installed dependencies or prototypes, extract dependency source at runtime, or emulate navigation through ordinary text replacement and synthetic keys. The adaptation SHALL remain within the Pi component boundary and SHALL NOT introduce a second terminal runtime or replace the terminal package's shared exports.

#### Scenario: Keep terminal module resolution unchanged
- **WHEN** the enabled bare-A1 default editor uses the owned adaptation
- **THEN** A1 and Pi extensions SHALL still resolve one shared pinned terminal package through the existing alias
- **AND** the package's exported editor constructors and the comparison editor SHALL NOT be replaced or mutated
- **AND** A1-owned consumers SHALL use the adaptation's declared typed interface rather than pretend it is an instance of a private Pi implementation

#### Scenario: An extension supplies a custom editor
- **WHEN** the existing public custom-editor factory mounts an extension-owned editor
- **THEN** its construction, focus, input, and public extension behavior SHALL remain unchanged
- **AND** default-editor history synchronization SHALL be suspended rather than patching or replacing that custom editor
- **WHEN** the factory lifecycle restores the default editor
- **THEN** the latest completed recall snapshot SHALL be reattached without losing the restored draft
- **AND** only actual classified user submissions SHALL enter durable history throughout these transitions

#### Scenario: Use public editor extension interactions
- **WHEN** an extension uses supported editor text access, shortcuts, autocomplete, or submission interactions with the active default editor
- **THEN** those public interactions SHALL retain their existing outcomes without reliance on the adaptation having Pi's concrete constructor identity

### Requirement: Changelog and Hotkeys applications present packaged release notes and live keybinding sections
Bare A1 SHALL present Changelog and Hotkeys as A1-owned reference-screen applications opened from the Launcher,
not as Agent slash commands: the owned route host SHALL NOT claim a typed `/settings`, `/changelog`, or
`/hotkeys` in bare A1. The Changelog application SHALL be titled `Changelog` and SHALL show the complete
packaged A1 release-note history read only from the local package resource, without querying GitHub, npm, or
another network service; when the package carries no notes it SHALL show `No A1 release notes found.`. The same
route opened with a supplied document SHALL be titled `What's New`. The Hotkeys application SHALL be titled
`Keyboard Shortcuts` and SHALL show the bare-A1 keybinding-derived tables, including the current editor
keybinding configuration and extension shortcut descriptions gathered when the screen opens, carried as
structured sections rather than recognized from rendered text. Opening either application SHALL append no
document, status, checkmark, or error row to the feed.

The `a1 pi` comparison profile SHALL keep the pinned Pi `/changelog` and `/hotkeys` workflows, their pinned
content, and their in-feed presentation. It SHALL NOT read A1's release-note acknowledgement or substitute A1
release notes for Pi's.

#### Scenario: Open Changelog in bare A1
- **WHEN** the user opens Changelog from the Launcher in bare A1
- **THEN** the `Changelog` reference screen SHALL open with the complete packaged A1 release-note history and the
  feed SHALL gain no rows

#### Scenario: Use Changelog without network access
- **WHEN** the user opens Changelog while GitHub and npm are unavailable
- **THEN** the packaged notes SHALL remain available without a network request

#### Scenario: Open Hotkeys in bare A1
- **WHEN** the user opens Hotkeys from the Launcher in bare A1
- **THEN** the `Keyboard Shortcuts` reference screen SHALL open with structured keybinding-derived sections and
  the feed SHALL gain no rows

#### Scenario: Type an application name as a command in bare A1
- **WHEN** the user submits `/changelog`, `/hotkeys`, or `/settings` in bare A1
- **THEN** the owned route host SHALL NOT open the corresponding application for that input

#### Scenario: Invoke either command in the comparison profile
- **WHEN** the user submits `/changelog` or `/hotkeys` in `a1 pi`
- **THEN** the pinned workflow SHALL retain its pinned Pi content and in-feed presentation and SHALL open no
  A1-owned reference screen

### Requirement: Dismissible bare-A1 surfaces end their shortcut guidance with Esc close
Every A1-rendered dismissible modal, selector, dialog, nested flow, authentication surface, startup trust
selector, operation dialog, and owned reference or Settings screen in bare A1 SHALL end its active shortcut
guidance with exactly one canonical dismissal entry `Esc close`, whether dismissal silently closes a top-level
surface, aborts an operation while closing its progress dialog, or exits startup. A nested step that returns to
its parent step inside the same dialog, such as the thinking-level step of the Settings Default Model dialog,
SHALL show `Esc back` instead. Other shortcut labels SHALL come from the bindings and platform rules used by
the corresponding action and SHALL use display capitalization with lowercase action names. Additional effective
or implicit close aliases, including Ctrl+C, SHALL NOT appear in the entry. When the available width can contain
the complete `Esc close` entry, clipping of other guidance SHALL NOT omit or partially clip it; narrower
rendering SHALL remain ANSI-safe. The pre-resource trust selector SHALL render the same entry from fixed
startup-safe roles without loading project settings, themes, extensions, packages, skills, or post-trust
components. Escape uses outside active-surface dismissal, including editor autocomplete clearing and shell
interruption, and the `a1 pi` comparison profile SHALL remain outside this rule.

#### Scenario: Open a bare-A1 dialog
- **WHEN** a dismissible bare-A1 dialog such as Skills, Thinking Level, Models, or Session Tree is presented
- **THEN** its shortcut row SHALL end with exactly one `Esc close` entry
- **AND** no Ctrl+C alias SHALL appear in that entry

#### Scenario: Keep close guidance visible
- **WHEN** a dismissible surface has enough width for the complete `Esc close` entry but its other shortcut
  guidance overflows
- **THEN** `Esc close` SHALL remain complete and visible while preceding entries are clipped

#### Scenario: Return from a nested step
- **WHEN** the Settings Default Model dialog shows its thinking-level step
- **THEN** its Escape entry SHALL read `Esc back` and Escape SHALL return to the model list

#### Scenario: Ask for project trust before resources load
- **WHEN** the pre-resource trust selector is presented
- **THEN** its shortcut row SHALL read `↑↓ navigate`, `Enter select`, and `Esc close`
- **AND** rendering it SHALL NOT load project settings, themes, extensions, packages, skills, or post-trust
  components

#### Scenario: Use the comparison profile
- **WHEN** the same modal route is presented through `a1 pi`
- **THEN** its pinned shortcut presentation SHALL remain unchanged

## MODIFIED Requirements

### Requirement: Public engine and terminal authority remain behind A1 boundaries

The owned UI SHALL use documented public Pi engine and terminal contracts through A1-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout A1 workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries. The engine adapter SHALL be a facade over adapter-owned components, each reachable through explicit ports and testable without an engine: the runtime and session lifecycle (creation, generations, subscription, disposal order), transcript projection, event delivery, session event translation, command dispatch, workflows and their selector contexts, provider authentication, settings, resource discovery, prompt suggestions, and the extension UI binding. The adapter alone SHALL own the view model, editor and status state, and the wiring between those components. The owned session shell SHALL take its composition as options grouped by the collaborator that provides them (engine, presentation, history, suggestions, prompt images, skills, diagnostics, shared services) so that each composition profile states what it supplies and a fixture can supply one group without the others.

#### Scenario: Pinned private interactive code is installed
- **WHEN** the Pi package contains stock interactive classes or private renderer state
- **THEN** A1 SHALL operate without constructing, patching, or inspecting those internals

#### Scenario: Exact behavior requires a coupled source unit
- **WHEN** covered behavior cannot be reused through a documented public contract
- **THEN** A1 SHALL port the minimum coherent source unit with provenance and an A1-owned boundary rather than deep-importing or patching it

#### Scenario: Drive an engine component without the adapter
- **WHEN** the runtime lifecycle, command dispatch, session event translation, settings port, resource catalog, prompt suggestions, extension UI binding, or provider authentication is driven directly with fake sessions, runtimes, and ports
- **THEN** it SHALL produce the same generations, outcomes, work-state transitions, snapshots, resource summaries, suggestions, bindings, and wording the shell observes through the adapter

#### Scenario: Compose a shell from grouped options
- **WHEN** the bare-A1 composition, a comparison profile, or a test fixture constructs the owned session shell
- **THEN** it SHALL pass the engine group and only the other groups it provides
- **AND** a group that is not supplied SHALL leave the shell on that group's default behavior without affecting the other groups

### Requirement: Agent content presentation follows pinned Pi outside declared product differences

For equivalent supported inputs and visibility settings, the owned shell SHALL preserve pinned Pi's displayable content boundaries, tool-result presentation, text styling and spacing, and execution/renderer lifecycle behavior outside existing documented A1 product differences. It SHALL NOT replace supported structured tool presentation with a text approximation or introduce avoidable content disappearance or flashing through its adaptations.

This requirement SHALL preserve existing bounded delivery, payload validation, asset ownership, error isolation, and viewport/editor/modal/selection behavior. It SHALL NOT require removing documented A1 features, showing superseded partial snapshots, or modifying the pinned comparison route.

#### Scenario: Present ordinary text and tool output
- **WHEN** equivalent assistant text, thinking, fenced code, and text-only tool output are presented in A1 and the independent pinned reference
- **THEN** content boundaries and styled presentation SHALL match outside documented A1 differences
- **AND** A1 SHALL NOT omit a required surface or add artificial blank or argument-only replacement states

#### Scenario: Present structured tool results through a simplified adapter
- **WHEN** equivalent supported edit or extension results pass through A1's content-rendering adaptation
- **THEN** the actual result presentation and lifecycle behavior SHALL remain faithful to pinned Pi
- **AND** payload limits, attachment ownership, visible fallbacks, and unrelated transcript content SHALL remain protected

### Requirement: Command outcome messages retain pinned wording and severity

Except for the named missing-GitHub-CLI diagnostic and bare-A1 share presentation below, every existing supported Pi-backed command SHALL reproduce pinned Pi's user-visible messages for equivalent success, failure, warning, empty, progress, and cancellation states. Parity SHALL include whether a message is emitted at all, its literal wording and punctuation, contextual prefixes, links, severity, and order. Existing declared A1 route replacements, the bare-A1 share presentation, and layout/progress customizations SHALL remain explicit exceptions only within their declared scope; they SHALL NOT justify changing unrelated command-result messages. Actual selected-profile paths and truthful runtime values SHALL remain contextual data, not copied values from another profile.

For fatal `/new`, `/resume`, and `/import` outcomes, A1 SHALL preserve Pi-compatible visible error semantics but SHALL retain its recoverable workflow/session contract: the route returns a failed result and the owning A1 session remains active rather than stopping the terminal or propagating Pi's process exit. This lifecycle difference SHALL be the only exception to these outcomes' pinned behavior.

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
- **AND** the default viewer URL SHALL be `https://pi.dev/session/#<gist ID>` and a configured `PI_SHARE_VIEWER_URL` SHALL determine the base using pinned semantics

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
- **AND** this SHALL be the one wording difference from pinned Pi, which reports `Error: GitHub CLI is not logged in. Run 'gh auth login' first.` for a missing executable
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
- **WHEN** `/copy`, `/export`, `/name`, `/session`, `/tree`, `/trust`, `/resume`, `/reload`, `/new`, `/compact`, or `/quit`, or in the `a1 pi` comparison profile `/hotkeys`, `/changelog`, `/model`, or `/scoped-models`, completes
- **THEN** A1 SHALL preserve the pinned message or structured presentation, outside a declared bare-A1 replacement of that route, rather than replace it with a generic success/failure sentence
- **AND** operation-specific silent completion or cancellation SHALL remain silent where pinned Pi is silent

#### Scenario: Run a workflow without an engine
- **WHEN** the workflow runner is driven directly with a fake session, runtime, and interaction host
- **THEN** it SHALL refuse work while admission is stopped or the shared budget is spent, track and cancel admitted workflows except `/quit`, and produce the same per-command wording, clipboard acknowledgment, model cycling, and login completion the shell observes through the adapter
- **AND** the contexts reader SHALL shape the same provider, model, fork, tree, scoped-model, and session selector state from the same session and settings

### Requirement: The status-bar level name carries the existing thinking color

Bare A1 SHALL color the status-bar thinking-level name with the active theme's thinking-level border color mapping for that level. The level label SHALL update from authoritative session state after level cycling, setting changes, model changes, and session restoration. Only the level name SHALL receive that color; surrounding model, provider, usage, path, separators, and extension statuses SHALL retain their existing presentation. A selected model with level off SHALL show an off label using the existing off-level mapping; when no model is selected, the footer SHALL NOT invent an active level. Unsupported levels SHALL continue to use the engine's supported-level and clamping behavior rather than introducing a new cycle order.

#### Scenario: Cycle supported levels
- **WHEN** the user cycles through a model's supported levels
- **THEN** the visible level name SHALL update to the authoritative level and use that level's thinking-level border color
- **AND** both input bars SHALL remain on the semantic modal-border role and the level color SHALL NOT be muted by surrounding footer styling

#### Scenario: Disable thinking
- **WHEN** the selected model's authoritative level becomes off
- **THEN** the status bar SHALL display the off label in the existing off-level color and the input bars SHALL remain on the semantic modal-border role

#### Scenario: Change models or restore a session
- **WHEN** a model change or session restoration changes the effective thinking level
- **THEN** the footer SHALL display and color that effective level rather than retaining the prior model's label or color

#### Scenario: Render without an active model
- **WHEN** no model is selected
- **THEN** the existing no-model status SHALL remain and no active thinking-level label SHALL be fabricated

#### Scenario: Fit a narrow terminal
- **WHEN** the footer must omit provider text or truncate its right-hand content to fit
- **THEN** its existing width and truncation policy SHALL remain intact and any visible level-name span SHALL retain its level foreground without coloring adjacent text

### Requirement: Compaction progress is estimated in the working status

While a compaction is shown, bare A1 SHALL estimate its progress from the summarization stream and present it in the working status as `Compacting(n%)` beside the spinner, where `n` is an integer percent, followed by the shared progress marker `…`. The engine adapter SHALL observe the stream through the session agent's public stream function only between the compaction's start and end, SHALL count streamed summary text against an expected summary size taken from the previous compaction summary on the current branch or a fixed default when there is none, and SHALL publish the percent as engine status data separate from the semantic `Compacting` word. When the bound session exposes a callable stream function, the percent SHALL start at 0 immediately when compaction starts, including while summary preparation and provider authentication are pending; it SHALL never decrease within one compaction; estimated text progress SHALL NOT exceed 99 while the summary stream is active; and the progress SHALL reach 100 when that stream's public final result resolves successfully. The terminal observer SHALL be registered before the stream is returned to Pi so `100%` is published even when Pi consumes the result and ends compaction before an independent async iterator can observe the terminal event. Stream completion SHALL NOT end, abort, delay, or otherwise control the compaction. The progress SHALL be removed together with the compacting state when the real compaction-end lifecycle event arrives. Temporarily suspending and resuming event delivery for the same bound session SHALL restore observation before resumed session events are accepted and SHALL NOT leave later observable compactions on the no-progress fallback. When the stream cannot be observed the status SHALL remain `Compacting…`. A manual compaction that fails before summary streaming starts SHALL preserve pinned Pi's visible error rather than treating the failed command result as silent, while successful manual-compaction completion SHALL remain silent. Intermediate percentages SHALL remain estimates because the provider does not expose final summary length before completion. This SHALL be a declared bare-A1 progress presentation difference; the `a1 pi` comparison route SHALL keep its `Compacting...` label without a percent.

#### Scenario: Enter observable compaction before streaming
- **WHEN** bare A1 receives `compaction_start` from a bound session with a callable public stream function and summary preparation or provider authentication is still pending
- **THEN** bare A1 SHALL immediately show `Compacting(0%)…`

#### Scenario: Watch a compaction progress
- **WHEN** a compaction streams its summary and the branch holds a previous summary of 4,000 characters
- **THEN** bare A1 SHALL retain `Compacting(0%)…` until summary text streams and SHALL show `Compacting(50%)…` after 2,000 characters have streamed
- **AND** the estimated label SHALL show at most `Compacting(99%)…` while successful completion is not yet known

#### Scenario: Finish an observable summary stream
- **WHEN** a successful summary result resolves after its streamed character estimate reached only 40% to 50%
- **THEN** bare A1 SHALL publish `Compacting(100%)…` before the real compaction-end event removes the compaction label and progress
- **AND** the terminal publication SHALL NOT depend on the independent stream iterator observing exhaustion first

#### Scenario: Summary stream fails or becomes stale
- **WHEN** summary observation rejects, resolves with a failed or aborted response, is disposed, or belongs to a superseded compaction generation
- **THEN** bare A1 SHALL NOT publish `100%` from that observation
- **AND** the real session lifecycle SHALL remain responsible for clearing or replacing the compacting state

#### Scenario: First compaction without a previous summary
- **WHEN** the branch holds no previous compaction summary
- **THEN** the percent SHALL be measured against the fixed default size and estimated text progress SHALL still be clamped below 100 until the final result resolves successfully

#### Scenario: Resume an observable session
- **WHEN** the engine suspends and then resumes delivery for the same bound session with a callable public stream function
- **THEN** a later compaction SHALL immediately show `Compacting(0%)…` and advance from streamed summary text
- **AND** repeated resume SHALL NOT install nested observers or report stale progress

#### Scenario: Manual compaction has nothing to summarize
- **WHEN** `/compact` fails before summary streaming because the session is too small
- **THEN** bare A1 SHALL visibly show `Nothing to compact (session too small)` with pinned error presentation
- **AND** successful manual-compaction completion SHALL remain silent after its lifecycle status clears

#### Scenario: Stream is not observable
- **WHEN** the session agent exposes no callable stream function
- **THEN** the status SHALL show `Compacting…` without a percent and compaction SHALL proceed unchanged

#### Scenario: Comparison route
- **WHEN** the same compaction runs through `a1 pi`
- **THEN** the status SHALL show `Compacting...` without a percent

### Requirement: Bare A1 unifies model selection and scope management
Bare A1 SHALL expose one `/models` command for selecting the active model and managing the model scope used by cycling. Bare A1 SHALL NOT advertise or execute `/model` or `/scoped-models` as compatibility aliases. The pinned `a1 pi` comparison profile SHALL retain its existing `/model` and `/scoped-models` routes and presentations.

The Models dialog SHALL use the available authenticated model catalog and SHALL present an `all` filter and a `scoped` filter, searchable model rows ordered by provider and model identifier, the selected model's display name, and the effective model-scope state. Each row SHALL render its scope marker before the model identifier and its provider as `[provider]`. A filled scope marker `●` SHALL use the semantic accent foreground matching Thinking Level's filled default radio marker `◉`, while an empty scope marker `○` SHALL remain dim. The active-model checkmark SHALL remain success-colored and render immediately after `[provider]`, not before the provider or in another column.

Space SHALL toggle the selected model's membership in the session's cycling scope without closing the dialog. Tab SHALL switch the filter while preserving the applicable query and selection. Enter SHALL select the highlighted model for the active session only, SHALL leave the persisted default model unchanged, and SHALL close the dialog on success. Existing bulk-enable, clear, provider-toggle, and scope-order actions SHALL remain reachable through their effective model-scope bindings. Escape SHALL close silently while retaining session-only scope changes and SHALL NOT persist those changes implicitly.

The dialog SHALL compare its current scope and order with the last successfully saved scope. Whenever they differ, the title row SHALL read `Models (unsaved)`, with `(unsaved)` immediately after the title. Ctrl+S SHALL persist the current scope and order while leaving the dialog open; only a successful save SHALL clear `(unsaved)`. An empty explicit scope SHALL preserve the existing all-model cycling fallback.

Catalog refresh SHALL run in the background without adding `(refreshing)` to the title or rendering a progress or successful-completion sentence in the dialog body. A successful refresh SHALL silently update available rows while preserving the user's query, surviving selection, pending scope edits, and dirty state. Timeout and failure outcomes SHALL keep the same state and remain visible as actionable bounded warning details in the body without changing the title.

#### Scenario: Advertise the unified bare-A1 command
- **WHEN** bare A1 builds its slash-command catalog
- **THEN** `/models` SHALL be advertised as the model selection and scope-management command
- **AND** `/model` and `/scoped-models` SHALL not be advertised or accepted
- **AND** `a1 pi` SHALL retain its pinned command catalog unchanged

#### Scenario: Open the Models dialog
- **WHEN** the user invokes `/models` with available authenticated models
- **THEN** one dialog titled `Models` SHALL open with `all` and `scoped` filters, a search input, model rows, the selected model's display name, and model-management instructions
- **AND** an argument supplied to `/models` SHALL seed the search query rather than selecting an inexact model silently

#### Scenario: Render scope and active-model state
- **WHEN** a model row is rendered
- **THEN** its filled accent-colored or empty dim scope marker SHALL precede the model identifier
- **AND** the filled marker SHALL use the same semantic accent foreground as Thinking Level's filled default radio marker
- **AND** its success-colored active-model checkmark, when present, SHALL appear immediately after its `[provider]` badge
- **AND** marker colors SHALL remain independent of whether the row is highlighted

#### Scenario: Toggle scope without saving
- **WHEN** the user presses Space on a model whose scope membership changes
- **THEN** the dialog SHALL remain open and update the session's cycling scope immediately
- **AND** the title SHALL become `Models (unsaved)`
- **AND** switching between `all` and `scoped` SHALL reflect the pending scope state

#### Scenario: Save scope changes
- **WHEN** the user presses Ctrl+S after changing scope membership or order and persistence succeeds
- **THEN** the scope SHALL be saved, the dialog SHALL remain open, and `(unsaved)` SHALL disappear from the title
- **AND** a save failure SHALL leave `(unsaved)` visible and report the failure without closing the dialog

#### Scenario: Select the active model
- **WHEN** the user presses Enter on an available model
- **THEN** the active session model SHALL change through the existing model-selection policy
- **AND** the persisted default provider and model SHALL remain unchanged
- **AND** the dialog SHALL close and the footer SHALL show the new model without an added success message, while warnings and errors SHALL remain visible
- **AND** pending unsaved scope changes SHALL remain session-only rather than being saved as a side effect

#### Scenario: Cancel with pending scope changes
- **WHEN** the user presses Escape while the title shows `(unsaved)`
- **THEN** the dialog SHALL close silently and restore the ordinary input surface
- **AND** the changed scope SHALL remain effective for the current session but SHALL not be written to settings

#### Scenario: Refresh model catalogs
- **WHEN** the Models dialog starts its real background catalog refresh
- **THEN** the title SHALL remain `Models` or `Models (unsaved)` according to dirty state
- **AND** neither `(refreshing)` nor the full progress sentence SHALL appear in the dialog
- **WHEN** catalog refresh then succeeds
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state while updating the available rows
- **AND** the dialog SHALL not show `(refreshed)` or a success sentence

#### Scenario: Model catalog refresh fails or times out
- **WHEN** catalog refresh fails or times out while the Models dialog is open
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state without broadening availability to unauthenticated providers
- **AND** it SHALL report the bounded warning details in the dialog body without showing `(refreshing)` or `(refreshed)`

#### Scenario: Invoke an explicit model-selection binding
- **WHEN** the user invokes an explicitly configured model-selection shortcut in bare A1
- **THEN** the same unified Models dialog SHALL open
- **AND** scope management and current-session model selection SHALL have the same behavior as invocation through `/models`

### Requirement: The Skills dialog browses, searches, and applies a skill
The Skills dialog SHALL be an A1-owned modal built on public component boundaries and presented as a regular selector dialog like the model selector: the same overlay placement, owned input coordination, pinned border, spacer, search-input, list, and footer composition, and a shared shortcut footer reading `Type search`, `↑↓ navigate`, the effective confirm key with `select`, and `Esc close`. It SHALL preserve the existing modal contract for exposed transcript content. Its content SHALL be the accent bold title `Skills` above the search input, the matching skills as rows labeled with the bare `<name>` in discovery-sorted name order with the selected row prefixed `→ ` in the accent role, the selected skill's one-line whitespace-collapsed description in the muted role below the rows, and the pinned `(selected/total)` scroll counter only when rows exceed the visible window. The dialog rows SHALL NOT display the engine-facing `skill:` prefix. An empty filtered result SHALL render `No matching skills`; a session with no skills SHALL render `No skills yet`.

A row SHALL match a query when the query, ignoring case and an optional leading `skill:`, is a substring of the skill name or its description. Typing SHALL edit the query and reset the selection to the first row. Up and Down SHALL move the selection and wrap at either end. Enter SHALL apply the selected skill as the skills command defines, then close the dialog. Escape and the pinned cancel binding SHALL close the dialog and leave the editor text and history unchanged, exactly as cancelling the model selector does. The dialog SHALL open only from `/skills` with no arguments and SHALL never open with a seeded query. It SHALL NOT change the model, session, or settings. Expanded slash-command entries SHALL retain their `skill:<name>` labels, and the `/skills:` tunnel SHALL retain its `skills:<name>` labels.

#### Scenario: Browse skills
- **WHEN** the dialog opens with skills present
- **THEN** every skill SHALL be listed as `<name>` without a `skill:` prefix, with the first row selected and its description shown below the list
- **AND** the counter SHALL appear only when the rows overflow the visible window

#### Scenario: Search skills
- **WHEN** the user types `apply` in the dialog
- **THEN** only skills whose name or description contains `apply` SHALL remain, the first SHALL be selected, and its bare name and description SHALL be shown
- **AND** a query matching nothing SHALL render `No matching skills`

#### Scenario: Apply from the dialog
- **WHEN** the user presses Enter on a selected skill
- **THEN** the dialog SHALL close and `/skill:<name>` SHALL be submitted through the ordinary prompt path
- **AND** the search query SHALL NOT be appended as arguments

#### Scenario: Cancel the dialog
- **WHEN** the user presses Escape
- **THEN** the dialog SHALL close, nothing SHALL be submitted, and the editor SHALL keep its previous text

#### Scenario: Open with no skills
- **WHEN** `/skills` runs while no skill is discovered
- **THEN** the dialog SHALL render `No skills yet` and Enter SHALL do nothing

#### Scenario: Keep command-oriented skill labels outside the dialog
- **WHEN** skills are shown as expanded slash-command entries or through the `/skills:` tunnel
- **THEN** expanded entries SHALL remain labeled `skill:<name>` and tunnel entries SHALL remain labeled `skills:<name>`
- **AND** only the collapsed Skills dialog SHALL use bare names

### Requirement: Startup release notes open as a reference screen in bare A1
A stable bare-A1 package SHALL carry one reviewed note whose exact stable semantic
version matches the package version. On the first interactive bare-A1 launch for
which that note is not durably acknowledged, A1 SHALL render its first input-ready
frame and then automatically open that exact note in the existing full-screen
`What's New` reference screen. Non-interactive installation and update commands
SHALL NOT launch a UI. A development preview, a stable package without a valid
matching resource, and `a1 pi` SHALL NOT automatically open A1 release notes.

The automatic screen SHALL use the ordinary owned-route lifecycle and SHALL append no
release-note rows, status, or notice to the transcript. A project-trust prompt or
another startup/safety modal SHALL keep priority; the pending note SHALL open in the
next available owned-route slot after that modal closes rather than replacing it or
being discarded. A1 SHALL mark the exact stable version acknowledged only after the
screen rendered successfully and the user closed it. Load/render failure or process
exit before close SHALL leave it pending. The versioned acknowledgement SHALL be
bounded, atomic, product-owned, scoped to the A1 profile, monotonic across downgrades,
and independent of Pi's `LastChangelogVersion` and `collapseChangelog` settings. A
bounded claim SHALL prevent concurrent launches of the same profile from presenting
the same pending note simultaneously and SHALL recover a stale claim.

Bare A1 SHALL not turn pinned Pi startup changelog diagnostics into its release-note
notice or screen. The `a1 pi` comparison profile SHALL preserve Pi's pinned expanded
or collapsed startup changelog behavior and acknowledgement unchanged.

#### Scenario: Start bare A1 after an upgrade with the changelog expanded
- **WHEN** bare A1 starts from stable `0.2.2`, the package carries reviewed note `0.2.2`, that version is not acknowledged, and Pi's `collapseChangelog` setting is off
- **THEN** A1 SHALL paint an input-ready shell frame and then open the `0.2.2` note in the `What's New` screen without adding transcript content or a transient notice

#### Scenario: Start bare A1 with the changelog collapsed
- **WHEN** the same stable note is pending and Pi's `collapseChangelog` setting is on
- **THEN** A1 SHALL open the same reviewed A1 note in the `What's New` screen because Pi's collapse preference does not control product release notes

#### Scenario: Close the automatic release note
- **WHEN** the matching automatic note rendered successfully and the user closes it
- **THEN** A1 SHALL atomically acknowledge `0.2.2`, restore the session surface, and SHALL not auto-open that note on later launches of the same profile

#### Scenario: A modal is already presented
- **WHEN** the matching note is pending while project trust or another startup/safety modal is presented
- **THEN** A1 SHALL leave that modal in place and SHALL open the note in the next safe owned-route slot after the modal closes

#### Scenario: Continue working after the startup notice
- **WHEN** assistant or tool content is added while the automatic full-screen note is open
- **THEN** that content SHALL remain ordinary transcript content behind the owned route, the note SHALL remain outside the transcript, and closing the note SHALL restore the current session surface without inserting a notice

#### Scenario: Presentation does not complete
- **WHEN** the note cannot load or render, its process exits before close, or its presentation claim becomes stale
- **THEN** A1 SHALL not record a false acknowledgement, SHALL bound any diagnostic, and SHALL allow a later launch to retry safely

#### Scenario: Two sessions start concurrently
- **WHEN** two bare-A1 launches of the same profile observe the same pending stable note
- **THEN** at most one live launch SHALL claim its automatic presentation, and an abandoned bounded claim SHALL not suppress the note permanently

#### Scenario: Launch a development preview
- **WHEN** bare A1 starts from `0.2.3-dev.612` while the package carries reviewed stable history
- **THEN** no A1 release note SHALL auto-open and no stable acknowledgement SHALL be consumed or created

#### Scenario: Launch an older stable version
- **WHEN** a user temporarily launches a stable version older than the acknowledged release
- **THEN** A1 SHALL not move the acknowledgement backwards or repeatedly reopen the older note

#### Scenario: Open release notes on request
- **WHEN** the user opens Changelog from the Launcher before or after the automatic note is acknowledged
- **THEN** the `Changelog` reference screen SHALL open with complete packaged A1 release-note history and the feed SHALL gain no rows

#### Scenario: Start the comparison profile after an upgrade
- **WHEN** `a1 pi` starts under conditions that would make bare A1's current stable note pending
- **THEN** no A1 note or acknowledgement SHALL be used, and Pi's pinned expanded or collapsed startup changelog behavior SHALL remain unchanged

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Every level row SHALL begin with a fixed-width exclusive-radio marker that differs from the Models dialog's multi-select state: the configured default SHALL use exactly one semantic accent-colored `◉`, and every non-default level SHALL use a semantic dim `○`. One space after that marker, every row SHALL render its unpadded level name. The active session level SHALL have exactly one semantic success-green checkmark one space immediately after the final visible cell of its level name, matching the item-adjacent active treatment used by other dialogs; the checkmark SHALL NOT be delayed to a shared marker column. Width-balancing padding SHALL follow the optional active marker so every description renders inline in semantic muted grey and begins at the same column regardless of active/default placement. The selector SHALL NOT render the textual `[default]` marker. Space SHALL immediately persist the highlighted level as the configured global default, move the single selected radio to that row, and replace the previous row's marker with an unselected radio without closing the selector, changing the active session level, or creating an unsaved state. Enter SHALL select the highlighted session level. Escape SHALL close the selector, and Ctrl+C SHALL close it through the same cancel path as the implicit close alias of every dismissible surface. The shortcut footer SHALL use semantic hint styling and read `Type search  Enter select  Space default  Esc close`. While the bare-A1 selector is open, the shell footer SHALL keep its current thinking-level suffix visible with its normal foreground. Default-only changes SHALL NOT change that displayed active level; selecting a new session level SHALL update it through the existing workflow. These interactions SHALL preserve the selector's borders, search input, navigation, filtering, focus, restoration behavior, narrow-width bounds, and comparison-profile isolation.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis
- **AND** the resolved cycle hint SHALL use semantic muted grey on the row directly below the heading

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** repeated available-level values SHALL render exactly once
- **AND** every row SHALL begin with a fixed exclusive-radio marker followed by one space and the unpadded level name
- **AND** only the configured default level SHALL use a semantic accent-colored `◉`
- **AND** every non-default level SHALL use a semantic dim `○`
- **AND** no row SHALL render the Models multi-select `●` or the textual `[default]` marker
- **AND** only the active session level SHALL place one semantic success-green checkmark one space immediately after its name
- **AND** trailing width-balancing space SHALL follow the optional active checkmark rather than separate it from the name
- **AND** every description SHALL use semantic muted grey and begin at the same column regardless of active/default placement
- **AND** the shell footer SHALL retain its current thinking-level suffix while the selector is open
- **AND** closing the selector SHALL leave the current suffix visible without a hide/restore transition

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, changes the default level, or closes the selector
- **THEN** the selector SHALL retain its specified interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, narrow-width bounds, focus, or instruction placement

#### Scenario: Stage and save a default level
- **WHEN** the user highlights a level and presses Space
- **THEN** the single selected radio `◉` SHALL move to that level immediately
- **AND** the previous default row SHALL render `○`
- **AND** that level SHALL be persisted as the global default immediately
- **AND** the selector SHALL remain open
- **AND** the active session level, its footer suffix, and its item-adjacent checkmark SHALL remain unchanged
- **AND** no unsaved label or staged state SHALL appear

#### Scenario: Select or close
- **WHEN** the user presses Enter on a highlighted level
- **THEN** that level SHALL be selected for the session through the existing selection workflow
- **WHEN** the user presses Escape
- **THEN** the selector SHALL close and restore its parent surface
- **WHEN** the user presses Ctrl+C
- **THEN** the selector SHALL close through the same cancel path as Escape

#### Scenario: Render compact controls
- **WHEN** the bare-A1 thinking selector is open
- **THEN** its semantic shortcut footer SHALL read `Type search  Enter select  Space default  Esc close` in that order
- **AND** `Type` SHALL use the quiet key role while `search` uses the action-text role
- **AND** it SHALL NOT advertise Ctrl+S, `Escape/Ctrl+C`, or the verbose `to select`, `to set as default`, or `to cancel` wording

#### Scenario: Preserve comparison behavior
- **WHEN** the user opens the thinking selector through `a1 pi`
- **THEN** the pinned comparison selector SHALL retain its existing interactions and presentation

### Requirement: Bare A1 keeps model and thinking commands adjacent
Bare A1 SHALL present `thinking` immediately after its unified `models` command in the advertised workflow catalog and slash-command autocomplete. All other owned built-in commands SHALL retain their relative order. The pinned `a1 pi` comparison profile SHALL retain its upstream command order unchanged.

#### Scenario: Open bare A1 slash-command autocomplete
- **WHEN** bare A1 presents its built-in slash-command catalog
- **THEN** `models`, `thinking`, and `tree` SHALL be its first three built-in commands in that order, preceded only by the collapsed `skills` command when that command is present
- **AND** its advertised workflow catalog SHALL begin `models`, `thinking`, `tree`

#### Scenario: Open comparison slash-command autocomplete
- **WHEN** the `a1 pi` comparison profile presents its built-in slash-command catalog
- **THEN** `model`, `tree`, `thinking`, and `scoped-models` SHALL remain in pinned upstream order

### Requirement: The collapsed skills command keeps a primary built-in position

While bare A1 presents skills in collapsed form, the synthetic `skills` command SHALL appear exactly once in the top-level slash-command catalog as its first command, immediately before `models`. All other built-in commands SHALL retain their declared relative order, including `quit` as the final built-in command, and all remaining prompt-template, extension, and other resource commands SHALL retain their existing relative order after the built-in catalog.

This ordering SHALL apply only to the synthetic collapsed command. Expanded `skill:<name>` entries SHALL retain their engine-provided placement, a catalog with no synthetic collapsed command SHALL remain unchanged, and the `a1 pi` comparison profile SHALL retain the pinned catalog.

#### Scenario: Open the collapsed command menu
- **WHEN** bare A1 has discovered skills, skill commands are enabled, `skillsPresentation` is `collapse`, and the user opens the top-level slash-command menu
- **THEN** `skills` SHALL appear exactly once as the first command, immediately before `models`
- **AND** the remaining built-ins SHALL follow in their existing relative order through `quit`
- **AND** ordinary resource commands SHALL retain their existing relative order after `quit`

#### Scenario: Open the expanded command menu
- **WHEN** bare A1 uses `skillsPresentation` value `expand`
- **THEN** no synthetic `skills` command SHALL be inserted
- **AND** discovered `skill:<name>` entries SHALL retain their existing engine-provided placement

#### Scenario: Compare the pinned profile
- **WHEN** the command menu is opened through the `a1 pi` comparison profile
- **THEN** the pinned command catalog SHALL remain unchanged and no synthetic `skills` command SHALL be inserted

### Requirement: Pre-resource project trust uses a compact bottom dialog
Bare A1 SHALL present an interactive pre-resource trust decision as a vertically compact, ruled dialog anchored to the bottom of the bounded startup surface. Its top and bottom rules SHALL use the derived border tone of the pre-resource color family and span the full available terminal width. The explanation SHALL read exactly `This allows to load project settings and resources, install missing project packages, and execute project extensions.` and SHALL NOT insert the product name. The dialog SHALL use the established bare-A1 modal hierarchy for its title, working-directory context, explanation, selected and unselected option rows, and semantic shortcut hints while remaining implemented only from fixed startup-safe wording, ANSI roles, terminal dimensions, and bounded rendering helpers. It SHALL NOT load or consult project settings, themes, extensions, prompts, packages, skills, or post-trust components.

The dialog SHALL remain readable at supported terminal sizes, SHALL prioritize the title, path, choices, and actionable controls when height is constrained, and SHALL clip or wrap without replaying untrusted terminal control content. Completion, interruption, input end, and errors SHALL clear the owned startup frame and restore raw mode, cursor state, and the parent terminal exactly once.

#### Scenario: Present trust at the bottom
- **WHEN** an interactive launch needs a project-trust decision in a terminal with sufficient rows
- **THEN** A1 SHALL render one vertically compact ruled trust dialog against the bottom of the startup surface
- **AND** its top and bottom rules SHALL span the full available terminal width
- **AND** it SHALL not render the trust content as a loose page at the top-left

#### Scenario: Match ordinary selector hierarchy
- **WHEN** the trust dialog is visible
- **THEN** its title, path context, option list, selected arrow, and key/action hints SHALL use the same visual hierarchy as the bare-A1 Models and Thinking dialog family
- **AND** its explanation SHALL use the exact product-neutral wording without `a1`
- **AND** its shortcut hint SHALL align with its local heading

#### Scenario: Constrain a small terminal
- **WHEN** the available rows or columns cannot show the preferred dialog geometry
- **THEN** A1 SHALL use a deterministic bounded fallback that retains the decision choices and controls
- **AND** clipping or wrapping SHALL remain ANSI-safe

#### Scenario: Keep the trust dialog startup-safe
- **WHEN** the dialog renders before a trust decision exists
- **THEN** no project setting, theme, extension, prompt, package, skill, or post-trust component SHALL be loaded or consulted

#### Scenario: Exit without a trust decision
- **WHEN** the user presses Escape while the bare-A1 trust dialog is active
- **THEN** A1 SHALL restore the parent terminal and terminate startup without constructing the owned shell
- **AND** A1 SHALL NOT infer, persist, or activate any trust outcome

#### Scenario: Operate and restore the dialog
- **WHEN** the user navigates, confirms, exits, interrupts, or the input stream ends or fails
- **THEN** arrows and Tab SHALL move selection and Enter SHALL confirm one of the five pinned Pi trust outcomes
- **AND** those outcomes SHALL be Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only
- **AND** Escape SHALL be advertised as the only bare-A1 exit action while Ctrl+C SHALL NOT dismiss the selector
- **AND** Escape SHALL restore the terminal exactly once and abort startup without constructing the owned shell
- **AND** A1 SHALL restore raw mode, disable child-owned input/presentation modes, and show the cursor after leaving the alternate screen
- **AND** A1 SHALL preserve the restored parent cursor across the parent-screen margin reset and write no parent-buffer content, allowing the shell to preserve prior rows and paint its next empty prompt

#### Scenario: Use the comparison profile
- **WHEN** the same launch runs through `a1 pi`
- **THEN** it SHALL offer the same pinned Pi trust outcomes
- **AND** its top-left comparison presentation and Escape/Ctrl+C cancellation SHALL remain unchanged by the bare-A1 trust-dialog customization

### Requirement: Bare-A1 changelog reference links use terminal-native decoration

Bare A1 SHALL present hyperlinks in both the complete Changelog application history and startup release-note reference documents with the same terminal-native decoration policy as agent-content links. Changelog links SHALL preserve their visible labels, foregrounds, exact OSC 8 targets, wrapping, scrolling, and activation behavior while omitting renderer-owned solid underline controls, allowing the terminal to provide its native idle decoration and solid hover decoration. This policy SHALL NOT alter hotkeys or other reference documents, the `a1 pi` comparison profile, untouched Pi, or installed Pi packages.

#### Scenario: Present a changelog link at rest and on hover
- **WHEN** a bare-A1 changelog or startup release-note reference screen contains a hyperlink
- **THEN** its visible label, foreground, and exact target SHALL match the rendered release note without an explicit solid underline at rest
- **AND** the terminal SHALL remain able to apply its native idle decoration and solid hover decoration to only that link

#### Scenario: Keep unrelated reference and comparison presentation unchanged
- **WHEN** bare A1 renders a hotkeys reference document or `a1 pi` renders its pinned in-feed changelog
- **THEN** the bare-A1 changelog hyperlink policy SHALL NOT alter that presentation

### Requirement: Bare-A1 Session Tree follows the standard dialog presentation

The bare-A1 Session Tree SHALL use the same compact framed hierarchy as the Models dialog. Exactly one empty visual row SHALL separate preceding transcript or status content from the tree's top rule. The top rule SHALL be followed immediately by an accent-bold `Session Tree` title, and the frame SHALL contain no separator rule between search and results.

The title SHALL be followed immediately by a Models-style `Filter: all | no tools | user | labeled` row using accent for the active mode and muted styling for inactive modes. The product `all` mode SHALL use a concise view: it SHALL show resolved entry labels while hiding raw label-change, context-edit, custom bookkeeping, session-info, usage, model-change, and thinking-level-change entries. An unset, upstream `default`, or upstream `all` initial setting SHALL open with product `all` active, while an explicitly configured `no tools`, `user`, or `labeled` mode SHALL remain active. `Tab` SHALL be the default and displayed shortcut that cycles the four product filters forward; the footer SHALL show `Tab filter` instead of the individual filter bindings. Hidden bookkeeping entries SHALL NOT contribute to the visible result counter.

The search control SHALL use the ordinary dialog input presentation, including its prompt icon and text-colored query, and SHALL NOT render a `Type to search:` label. Its cursor SHALL remain after the final typed character unless the user explicitly moves it. Existing tree search matching, the semantics of each filter mode, folding, navigation, copy, label, label-time, and horizontal clipping SHALL remain available. A row clipped at either horizontal edge SHALL show the single-character ellipsis `…` at that edge. On a selected row, every visible clipped fragment and ellipsis SHALL remain inside the selection highlight. A right-clipped bracketed tool row SHALL end with `…]` so its closing delimiter remains visible. `PageUp` and `PageDown` SHALL move by one visible page, and `Home` and `End` SHALL select the first and last visible entries. The system message rendered as the top-level `session` row SHALL remain permanently expanded and SHALL NOT be a Left/Right fold target, including when hidden model-change, thinking-level-change, or other bookkeeping entries precede it in the persisted tree and give it a non-null parent. Unmodified `Left` SHALL collapse the nearest expanded eligible non-system branch containing the cursor, even when a descendant is selected; if no such branch exists before the system session entry, it SHALL leave the tree and selection unchanged. `Right` SHALL expand an eligible branch after the collapsed view selects its branch root and SHALL leave the system session entry unchanged. Session-root eligibility SHALL follow semantic system-message identity rather than input-root position, persisted `parentId`, or visible ancestry, so filtering out the system row SHALL NOT by itself disable folding for an otherwise eligible non-system branch.

The selected tree entry SHALL use the ordinary menu arrow `→` with the accent-derived `selectedBg` selection background. Its primary entry label SHALL be highlighted while message content serving as its description SHALL remain muted, without whole-row bold treatment. Tree entries SHALL NOT render active-path bullets. Entry labels SHALL use the theme accent color. When label-time display is enabled, its timestamp SHALL be enclosed in square brackets and use the same accent color as the label. The result counter SHALL remain numeric and SHALL NOT append `label time` or other timestamp-state text. Unselected `user:` labels SHALL be green, unselected `assistant:` labels SHALL be yellow, and system entries SHALL render as muted `session`. An empty search result SHALL show only `No entries found` without a `(0/0)` counter or standalone `label time` status.

The tree's semantic shortcut hints SHALL appear after the result area at the bottom of the frame, use the shared key/action styling, and have no trailing blank row before the bottom rule. Their order SHALL follow the Models dialog: `Type search`, vertical navigation, `Tab filter`, extended page/first-last/branch navigation, then copy and label actions. The label-timestamp shortcut action SHALL read `time (off)` while label timestamps are hidden and `time (on)` while they are visible, updating with the current state after each toggle. The footer SHALL omit an `Enter select` hint.

While editing an entry label, the frame title SHALL become accent-bold `Label`, followed immediately by a muted `Empty to remove` subheader. The standard single-line input SHALL follow after one blank row. The tree search control, results, filter/navigation shortcuts, and `Session Tree` title SHALL be hidden. Only the shared save/cancel shortcut footer SHALL remain, immediately followed by the bottom rule.

#### Scenario: Open the Session Tree below existing content
- **WHEN** the user opens `/tree` after transcript or status content is visible
- **THEN** exactly one empty visual row SHALL separate that content from the tree's top rule
- **AND** the accent-bold title SHALL immediately follow the top rule
- **AND** no internal rule SHALL separate the search control from the tree results

#### Scenario: Open and cycle the tree filter
- **WHEN** the Session Tree opens without an explicitly configured non-default filter
- **THEN** the Models-style filter row SHALL show `all` as active
- **AND WHEN** the user presses `Tab`
- **THEN** the next filter SHALL become active
- **AND** the shortcut footer SHALL show `Tab filter` without `Ctrl+O` filter-cycle guidance

#### Scenario: Keep product all concise
- **WHEN** the Session Tree contains resolved entry labels and raw bookkeeping entries
- **THEN** product `all` SHALL show each resolved label on its target entry
- **AND** raw label-change, context-edit, custom bookkeeping, session-info, usage, model-change, and thinking-level-change entries SHALL NOT render
- **AND** the filter row SHALL NOT offer a separate `standard` mode or raw-bookkeeping `all` mode
- **AND** the visible result counter SHALL exclude hidden bookkeeping entries

#### Scenario: Navigate and fold the tree with standard keys
- **WHEN** the user presses `PageUp`, `PageDown`, `Home`, or `End`
- **THEN** `PageUp` and `PageDown` SHALL move selection and the visible result window by one page, while `Home` and `End` SHALL select the first or last visible entry respectively
- **AND WHEN** any entry within an eligible expanded non-root branch is selected and the user presses `Left`
- **THEN** the nearest eligible non-root branch SHALL collapse and selection SHALL resolve to its visible branch root
- **AND WHEN** the user then presses `Right`
- **THEN** that branch SHALL expand without moving selection to another branch

#### Scenario: Keep the session root expanded behind hidden metadata
- **GIVEN** model-change and thinking-level-change entries precede the system message in the persisted tree and are hidden from product `all`
- **WHEN** the visible `session` entry is selected and the user presses `Left` or `Right`
- **THEN** the system session entry SHALL remain expanded despite its non-null persisted parent
- **AND** the visible rows and selection SHALL remain unchanged

#### Scenario: Do not fall through to the session root
- **WHEN** a descendant is selected and the top-level session root is the only containing entry that would otherwise qualify for folding
- **AND** the user presses `Left`
- **THEN** the Session Tree SHALL remain expanded instead of collapsing to the single `session` row
- **AND** selection SHALL remain on the selected descendant

#### Scenario: Preserve branch folding when filters hide the system row
- **WHEN** a filter hides the system session entry and an eligible non-system branch appears at the visible root
- **THEN** that branch SHALL retain its existing collapse and expansion behavior
- **AND** visible-root or input-root placement alone SHALL NOT classify it as the system session entry

#### Scenario: Clip a long tree row
- **WHEN** a tree item extends beyond the left or right edge
- **THEN** each clipped edge SHALL show the single-character ellipsis `…`
- **AND** a selected clipped row SHALL keep its complete visible fragment, including ellipses, selected
- **AND** a right-clipped bracketed tool row SHALL end with `…]`

#### Scenario: Search the tree
- **WHEN** the Session Tree is open and the user types a search query
- **THEN** the search row SHALL show the ordinary input prompt icon and text-colored query without `Type to search:`
- **AND** the cursor SHALL appear after the final typed character unless the user moved it
- **AND** the tree SHALL retain its existing search and filter behavior

#### Scenario: Highlight an entry
- **WHEN** a tree entry is selected
- **THEN** the row SHALL begin with the ordinary menu arrow `→`
- **AND** only its primary label SHALL receive selected emphasis while descriptive message text remains muted
- **AND** the selected span SHALL use the accent-derived `selectedBg` background
- **AND** no active-path bullet or whole-row bold treatment SHALL be applied

#### Scenario: Distinguish message roles and entry labels
- **WHEN** labeled, unselected user, assistant, and system entries are visible
- **THEN** the entry label SHALL use the theme accent color
- **AND** any enabled label timestamp SHALL use the same accent color and square-bracket form
- **AND** the numeric result counter SHALL NOT show `label time` or any other timestamp-state text
- **AND** `user:` SHALL be green and `assistant:` SHALL be yellow
- **AND** the system entry SHALL read `session`

#### Scenario: Read tree shortcut hints
- **WHEN** the ordinary Session Tree is visible with label timestamps hidden
- **THEN** its footer SHALL begin with `Type search`, vertical navigation, and `Tab filter` in that order
- **AND** its label-timestamp action SHALL read `time (off)` rather than `label time`
- **AND WHEN** the user toggles label timestamps on
- **THEN** the same action SHALL read `time (on)`
- **AND** it SHALL omit an `Enter select` hint
- **AND** page, first/last, branch, copy, and label guidance SHALL retain their established order

#### Scenario: Edit an entry label
- **WHEN** the user opens label editing for a tree entry
- **THEN** the frame SHALL show the accent-bold title `Label` and muted subheader `Empty to remove`
- **AND** one standard single-line input SHALL be visible without the tree search or results
- **AND** only save and cancel shortcut hints SHALL be visible immediately above the bottom rule

#### Scenario: Search with no matches
- **WHEN** the current query matches no tree entries
- **THEN** the result area SHALL show only `No entries found`
- **AND** it SHALL NOT show `(0/0)` or standalone `label time` status

#### Scenario: Render tree shortcuts
- **WHEN** the Session Tree renders navigation and action hints
- **THEN** those hints SHALL use the shared shortcut-row key/action styles below the result area
- **AND** the next rendered row SHALL be the frame's bottom rule

### Requirement: Bare-A1 project-trust dialogs use the standard dialog hierarchy

Both the pre-resource startup trust selector and the in-session project-trust selector SHALL use the established bare-A1 dialog hierarchy. Titles SHALL use bold accent styling and Title Case without a trailing colon: `Trust Project Folder?` at startup and `Project Trust` in-session. Selected choices SHALL use the shared selected-background role, an accent arrow, normal-text labels, and no selection-induced bold, matching the item-bounded highlight used by Skills rather than accent-colored labels alone. Top and bottom rules SHALL use the standard border role; ordinary path and label context SHALL remain muted; and shortcut rows SHALL use distinct dim key and muted action roles with whitespace-only entry gaps. The startup selector SHALL reproduce those roles from the startup-safe pre-resource color family without consulting project settings, project themes, extensions, prompts, packages, skills, or post-trust components.

In the in-session selector, `Saved decision:` and `Current session:` SHALL remain muted labels while their decision values use the normal text role. Both values SHALL start in the same left-aligned column, padding after the shorter label. The saved-decision value SHALL omit any parenthesized folder-path suffix while retaining its actual resolved decision. Every selected trust option SHALL contain exactly one visible space between its arrow and label. The choice list SHALL NOT display a saved-decision checkmark; an exact saved choice SHALL instead be represented by the status line and initial active selection. The shortcut row SHALL be followed immediately by the bottom rule without an intervening blank row.

These presentation requirements SHALL NOT change trust outcomes, persistence, policy resolution, confirmation, exit/cancel behavior, terminal restoration, constrained-terminal fallback, or the explicit `a1 pi` comparison profile. In-session Up/Down navigation SHALL follow the internal choice-list wraparound policy.

#### Scenario: Ask for trust before project resources load

- **WHEN** bare A1 presents the pre-resource startup trust selector
- **THEN** its title SHALL be the accent-bold text `Trust Project Folder?` and its selected option SHALL use the standard selected background, accent arrow, and normal-text label
- **AND** its full-width rules SHALL use the standard border role
- **AND** its shortcut row SHALL present `↑↓ navigate`, `Enter select`, and `Esc close` with the standard key/action roles and two-space entry gaps
- **AND** producing that frame SHALL not consult project-derived presentation or resources

#### Scenario: Show current project trust in-session

- **WHEN** bare A1 presents the in-session project-trust selector
- **THEN** the title SHALL be the accent-bold text `Project Trust` without a trailing colon, and the active selection, rules, and shortcut row SHALL use the same semantic roles as other standard dialogs
- **AND** `Saved decision:` and `Current session:` SHALL be muted while the value following each label SHALL use the normal text role
- **AND** both decision values SHALL begin in the same left-aligned column, with no parenthesized folder-path suffix after the saved decision
- **AND** the separate project-path context row and underlying saved/current trust decisions SHALL remain unchanged
- **AND** the shortcut row SHALL be directly adjacent to the bottom rule

#### Scenario: Select a trust option

- **WHEN** any in-session trust option is active
- **THEN** its visible row SHALL render the accent arrow, exactly one space, and the normal-text option label over the shared item-bounded selected background without selection-induced bold
- **AND** no option SHALL reserve a saved-marker gap or display a checkmark

#### Scenario: Open with an exact saved choice

- **WHEN** an in-session trust option exactly represents the saved decision
- **THEN** that option SHALL receive the initial active selection
- **AND** the saved-decision status line SHALL communicate persistence without adding a second marker to the choice list

#### Scenario: Constrain or close a trust dialog

- **WHEN** either trust surface is resized, navigated, confirmed, cancelled, exited, interrupted, or disposed
- **THEN** its existing choices, responsive priority, non-navigation key behavior, trust effects, and restoration lifecycle SHALL remain unchanged
- **AND** selected spans SHALL remain within the available width without wrapping or background leakage
- **AND** the `a1 pi` comparison presentation SHALL remain unchanged

### Requirement: Bare-A1 Resume Session follows the standard dialog hierarchy

The bare-A1 Resume Session selector SHALL use the shared compact modal hierarchy of top rule, title, filter/status row, search and results, bottom shortcut footer, and bottom rule. The owned selector SHALL NOT add a component-level blank row before its top rule, so a retained prompt-adjacent command notice has exactly one empty visual row before the dialog while it is open, matching the spacing after the default editor is restored. Its full-width top and bottom rules SHALL use the same standard dialog border role as Session Tree and Models rather than the title accent role, including while rename mode is active. Its title SHALL be the standalone accent-bold text `Resume Session` and SHALL NOT repeat the active scope as `(Current Folder)` or `(All)`.

The row immediately below the title SHALL begin with `Filter: current | all`, followed by `Name: all` or `Name: named` and `Sort: threaded`, `Sort: recent`, or `Sort: fuzzy`. Labels, separators, and inactive scope values SHALL use the established inactive status styling; the active scope and current name and sort values SHALL use the accent role. Values SHALL use the specified lower-case display text. The row SHALL remain stable during asynchronous scope loading and SHALL NOT append `loading` or loader work-unit counts to either scope value.

When all-session discovery supplies partial results, the result list SHALL update incrementally. Whenever the existing paging indicator is applicable, its `(selection/total)` total SHALL count the currently discovered sessions that match the active query and name filter, and SHALL grow as further matching sessions arrive. It SHALL NOT label that count as loading or substitute loader work-unit progress for the visible matching-result total.

Every selected ordinary session result SHALL use the Session Tree's accent `→` arrow and `selectedBg` selection background while retaining the same title and path/count/age foreground roles it has when unselected, without selected-title bolding. The currently active session title SHALL use the success-green role associated with an active checkmark independently of keyboard selection. A selected delete-confirmation result SHALL retain its error-colored primary title and metadata. The background SHALL form one continuous full-width selection, regardless of the title or path length. When cwd or explicit path metadata is visible, every rendered row SHALL reserve a shared path column followed by separately aligned message-count and age columns. Session titles SHALL truncate before the path column with visible separation, and paths that exceed their bounded column SHALL truncate within that column rather than displacing the title, count, or age columns.

While the ordinary search query is empty, its input SHALL show the exact presentation-only placeholder `re:<pattern> regex, "phrase" exact`. The comma after `regex` SHALL visibly separate the regular-expression form from the quoted exact-phrase form. Placeholder text after the caret SHALL use the established quiet search-suggestion treatment, while the active reversed caret cell SHALL retain the ordinary neutral-white input weight used by Settings search rather than inheriting the grey suggestion weight. The caret SHALL occupy the placeholder's first cell, and the placeholder SHALL NOT become part of the query. Entering a real query SHALL replace the placeholder while preserving existing fuzzy, regex, and exact-phrase matching behavior.

The ordinary shortcut footer SHALL appear below the session results as one semantic row aligned to the same shared content inset as the title and status row. Its entries SHALL be ordered as `Type search`, vertical navigation, `Enter select`, `Tab scope`, sort, named filtering, delete, path display with current state, optional rename, and `Esc close`. Keys and actions SHALL use the shared shortcut roles. The footer SHALL preserve the canonical `Esc close` entry completely by clipping preceding guidance first when width is constrained, and SHALL NOT wrap into a second ordinary hint row. The bottom rule SHALL immediately follow that row. Delete confirmation, transient mutation status, and load errors SHALL continue to use the bottom feedback area rather than replacing or joining the title/status rows. Existing search, scope switching, sorting, name filtering, path display, rename, deletion, selection, loading, cancellation, and result-list behavior SHALL remain available.

#### Scenario: Open Resume Session
- **WHEN** the user opens the bare-A1 Resume Session selector
- **THEN** the accent-bold title SHALL read `Resume Session` without a scope suffix
- **AND** the next row SHALL show `Filter: current | all`, the current lower-case `Name:` value, and the current lower-case `Sort:` value
- **AND** the active scope and current name and sort values SHALL use the accent role

#### Scenario: Preserve compact spacing after a resume notice
- **WHEN** the `Resumed session` command notice remains visible and the user opens Resume Session again
- **THEN** exactly one empty visual row SHALL separate the notice from the dialog's top rule
- **AND** closing the dialog SHALL restore the editor with the same one-empty-row notice-to-control spacing

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
- **WHEN** an ordinary session result is selected
- **THEN** it SHALL begin with the accent `→` arrow used by Session Tree
- **AND** its primary title, path, count, and age SHALL retain the same semantic foreground roles they have while unselected without selected-title bolding
- **AND** the currently active session title SHALL remain success green whether or not that row is selected
- **AND** the `selectedBg` selection background SHALL cover the complete available row width
- **AND** moving selection between rows with different title or path lengths SHALL NOT change the highlight width

#### Scenario: Change session name and sort filters
- **WHEN** the user changes the named-session filter or sort mode
- **THEN** the `Name:` and `Sort:` values on the row below the title SHALL update using lower-case display text
- **AND** the updated current values SHALL use the accent role

#### Scenario: Read empty Resume Session search guidance
- **WHEN** the ordinary Resume Session search query is empty
- **THEN** its input SHALL show `re:<pattern> regex, "phrase" exact` with quiet suggestion styling after the caret
- **AND** the comma SHALL separate the regex and exact-phrase descriptions
- **AND** the placeholder SHALL remain presentation-only with the caret on its first cell
- **AND** that active reversed caret cell SHALL use ordinary neutral-white input weight rather than the grey suggestion weight

#### Scenario: Enter a Resume Session query
- **WHEN** the user types into the Resume Session search input
- **THEN** the real query SHALL replace the placeholder without inheriting its styling or content
- **AND** fuzzy, `re:` regex, and quoted exact-phrase matching SHALL retain their existing semantics

#### Scenario: Read Resume Session shortcuts
- **WHEN** the ordinary Resume Session selector is visible at a width that fits every shortcut
- **THEN** one footer row SHALL show `Type search`, vertical navigation, `Enter select`, `Tab scope`, sort, named filtering, delete, path state, optional rename, and `Esc close` in that order
- **AND** the title, filter/status row, search input, and shortcut row SHALL share the standard modal content inset
- **AND** the frame's bottom rule SHALL immediately follow the single shortcut row

#### Scenario: Constrain Resume Session shortcuts
- **WHEN** the ordinary Resume Session shortcut row does not fit the available width
- **THEN** it SHALL remain one row and preserve the complete `Esc close` suffix
- **AND** preceding entries SHALL be clipped before the close suffix rather than wrapping to another row

#### Scenario: Confirm session deletion
- **WHEN** the user starts deletion of a selected session
- **THEN** the selected title and metadata SHALL use the error role on the full-width selection surface
- **AND** the bottom feedback area SHALL replace ordinary shortcut hints with delete-confirm guidance followed by `Esc close`
- **AND** it SHALL NOT expose a cancel action or implicit Ctrl+C alias
- **AND** the title and filter/status rows SHALL remain in their standard positions

#### Scenario: Report session-selector status
- **WHEN** session loading fails or a session mutation reports transient success or failure
- **THEN** the message SHALL appear in the bottom feedback area before the final `Esc close` entry
- **AND** it SHALL NOT be appended to or replace the stable title and filter/status row

#### Scenario: Use existing session operations
- **WHEN** the user searches, changes scope, sorts, filters by name, toggles paths, renames, deletes, selects, or cancels
- **THEN** the operation SHALL retain its existing behavior while the standard modal hierarchy remains in place

### Requirement: Standard bare-A1 lists share one selection palette

The bare-A1 Models, Skills, Thinking Level, Resume Session, Session Tree, Settings, and editor autocomplete menus SHALL preserve their existing cursor and meaningful semantic foreground roles when selected. Every covered surface SHALL use the `selectedBg` selection background. Models, Skills, Thinking Level, Settings, and autocomplete SHALL retain their ordinary menu arrow `→` in accent foreground, a primary label in normal `text`, and muted descriptive text. Resume Session SHALL use an accent arrow, preserve each title and metadata foreground role under keyboard selection, and render only its currently active session title in success green, while Session Tree SHALL retain each entry's item-specific foreground and text-style roles. Selection SHALL NOT introduce bold styling. On item-bounded surfaces, the selected background SHALL cover only the rendered item span from its arrow through its final visible content cell, SHALL NOT fill otherwise unused cells after the item, and SHALL remain clipped within the available width without causing wrapping. Resume Session and Session Tree SHALL use full-row selection geometry whose background fills every available row cell regardless of rendered content length.

The selected-item treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its bare `<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Settings SHALL retain aligned labels and values, steppers, structured-value rows, floating choices, scrolling, search, and pointer affordances. Autocomplete SHALL retain aligned command descriptions and completion behavior. Session Tree SHALL retain its hierarchy, semantic entry roles, horizontal viewport, clipped-edge markers, and full-row geometry. Resume Session SHALL retain its specialized arrow, metadata, active-session identity, and full-row geometry.

Unselected rows, search and filter behavior, list ordering, counters, descriptions, navigation, selection actions, default and scope persistence, cancellation, and dialog lifecycle SHALL remain unchanged. The explicit `a1 pi` comparison profile SHALL retain pinned Pi presentation.

#### Scenario: Highlight a model

- **WHEN** a model row is selected in the Models dialog
- **THEN** its arrow SHALL use accent foreground and its model identifier SHALL use normal `text` on `selectedBg`
- **AND** its provider badge SHALL remain muted and its scope and active-state markers SHALL retain their semantic roles
- **AND** the background SHALL end with the row's final marker or provider content without changing the row order or model action

#### Scenario: Highlight a skill

- **WHEN** a skill row is selected in the Skills dialog
- **THEN** its arrow SHALL use accent foreground and its bare `<name>` label SHALL use normal `text` on `selectedBg`
- **AND** the background SHALL end with the final character of the skill name
- **AND** the selected skill description SHALL remain separately muted below the list

#### Scenario: Highlight a thinking level

- **WHEN** a thinking-level row is selected
- **THEN** its arrow SHALL use accent foreground and its level SHALL use normal `text` on `selectedBg`
- **AND** its reasoning description SHALL remain muted while current and default markers retain their semantic roles
- **AND** the aligned columns, selected value, and Enter and Space actions SHALL remain unchanged

#### Scenario: Highlight a Resume Session entry

- **WHEN** a Resume Session entry is selected
- **THEN** its accent cursor SHALL appear while its title and metadata retain the same semantic foreground roles they have while unselected on the full-row `selectedBg`
- **AND** the currently active session title SHALL use the same success-green role as a checkmark independently of keyboard selection and without becoming bold
- **AND** search, scope, sort, rename, delete, navigation, and selection behavior SHALL remain unchanged

#### Scenario: Highlight a Session Tree entry

- **WHEN** a Session Tree entry is selected
- **THEN** its existing `→` SHALL remain accent-colored and every entry fragment SHALL keep the same semantic foreground and text-style role it has while unselected on `selectedBg`
- **AND** the background SHALL cover every available row cell, including trailing cells after short content and every visible clipped-edge ellipsis, without changing tree hierarchy or viewport behavior
- **AND** moving selection between entries of different rendered lengths SHALL NOT change the highlight width

#### Scenario: Highlight a setting

- **WHEN** a row is selected in the bare-A1 Settings screen, a structured-value panel, or a floating choice menu
- **THEN** its existing arrow or marker SHALL remain accent-colored, its primary label SHALL use normal `text`, and its value SHALL retain its normal semantic foreground on `selectedBg`
- **AND** the background SHALL end with the final visible value or control cell without filling unused screen width
- **AND** navigation, search, scrolling, pointer actions, and value persistence SHALL remain unchanged

#### Scenario: Highlight a slash command

- **WHEN** a command is selected in the bare-A1 `/` menu
- **THEN** its existing `→` SHALL remain accent-colored, its command label SHALL use normal `text`, and its description SHALL remain muted on `selectedBg`
- **AND** the background SHALL end with the final visible command or description character
- **AND** navigation and completion behavior SHALL remain unchanged

#### Scenario: Render a selected row at narrow width

- **WHEN** any covered item-bounded list renders its selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every visible item cell SHALL retain the selection background
- **AND** cells after the visible item SHALL remain outside the selection background
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render a full-row Session Tree selection at narrow width

- **WHEN** Session Tree renders a selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every available row cell SHALL retain the selection background while clipped-edge markers remain visible
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render an unselected row

- **WHEN** a covered row is not selected
- **THEN** it SHALL retain its existing semantic foreground roles without the selected background or whole-row bold styling

#### Scenario: Use the pinned comparison profile

- **WHEN** the user runs the explicit `a1 pi` comparison profile
- **THEN** pinned Pi selector presentation SHALL remain unchanged by the bare-A1 selected-row treatment

### Requirement: Bare-A1 slash-command completion remains delimiter-ready

When the bare-A1 default editor applies a selected top-level slash-command row, it SHALL replace the search with `/<name>` and place the cursor immediately after the command name without inserting trailing whitespace. Tab SHALL leave that completed command in the editor for further input while continuously keeping autocomplete visible without a transient closed frame, then refresh it for the completed prefix so only the exact matching command row remains visible and selected, including before an immediately typed `:` or a user-entered space for arguments. Enter SHALL continue through the existing command-submission path after applying the row. This exception SHALL apply only to top-level slash-command application in bare A1; command-argument, path/resource, attachment, and other non-command completions SHALL retain their existing spacing and cursor behavior. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain the pinned trailing-space completion behavior.

#### Scenario: Complete a command with Tab

- **WHEN** the user selects the `resume` row from bare-A1 top-level slash-command autocomplete and presses Tab
- **THEN** the editor SHALL contain exactly `/resume` with the cursor immediately after `resume`
- **AND** autocomplete SHALL keep the current rows visible during the refresh and then show only the selected `resume` row and its description without submitting the command

#### Scenario: Continue into a command tunnel

- **WHEN** the user Tab-completes the selected `skills` row and immediately types `:`
- **THEN** the editor SHALL contain `/skills:` with the cursor at its end
- **AND** the existing skills-tunnel suggestions SHALL open without requiring deletion of whitespace

#### Scenario: Continue into command arguments

- **WHEN** the user Tab-completes an argument-bearing command and then types one space
- **THEN** the editor SHALL contain one command separator after `/<name>`
- **AND** its existing argument-completion behavior SHALL remain available

#### Scenario: Submit a selected command with Enter

- **WHEN** the user selects a top-level slash-command row in bare A1 and presses Enter
- **THEN** the existing command route SHALL receive `/<name>` without an added trailing space

#### Scenario: Preserve non-command and comparison completion

- **WHEN** the user applies an argument, path/resource, attachment, or other non-command completion, or applies a top-level command through `a1 pi`
- **THEN** its existing completion text, spacing, cursor placement, and outcome SHALL remain unchanged

### Requirement: Bare A1 projects one selected semantic accent across the active UI

Bare A1 SHALL derive its active presentation from the complete unmodified base Pi theme and, when `accentColor` names an A1 palette color, SHALL replace the semantic `accent` role plus the semantic `border`, `selectedBg`, `userMessageBg`, `mdHeading`, and `mdListBullet` roles used by dialog bars, selected rows, user prompts, secondary headings, active dialog-filter values, and Markdown list markers. The projected border and backgrounds SHALL be A1-owned tonal variations of the selected accent rather than the identical accent color; the border SHALL be a visibly darker neighboring-hue version of the accent, secondary headings, active dialog-filter values, keyboard-shortcut key spans, and Markdown list markers SHALL use a brighter complementary neighboring hue, filled scope/default state markers SHALL retain the neutral `text` role, selected backgrounds SHALL use a half-strength low-saturation tint closer to the terminal background or selected canvas, and list markers SHALL use the same derived secondary tone as active filters. Every owned, retained, shared-component, select-list, and extension-facing surface that requests semantic accent SHALL observe the same selected color for foreground painting, composed styles, ANSI lookup, and concrete color introspection. Every owned and retained package dialog bar SHALL observe the derived border through the live facade, while secondary headings, active dialog-filter values, selected rows, and visible user prompts SHALL observe their matching derived colors and existing relative prominence. A scrolled-out sticky prompt and the jump-to-bottom badge SHALL retain the base neutral `toolPendingBg` while resting and use the derived accent selection tone only when hovered. Every other semantic role SHALL retain the base theme's behavior and bytes; the independently configured fullscreen canvas SHALL alter only cells that otherwise use the terminal-default background.

Every derived family role SHALL be computed from the selected primary accent by one appearance-aware color transform rather than stored as a per-choice role color, and that transform SHALL accept an arbitrary concrete color so future custom accents inherit the same hierarchy. The active projection SHALL be reconstructed from the stored base theme after named-theme load, watched-file reload, terminal-appearance selection, or in-memory theme replacement. Reapplying a previously active projected in-memory theme SHALL unwrap to its original base and restore the same projected object identity for that base/accent pair. It SHALL NOT modify built-in or custom theme resources, write generated theme files, inspect the name `violet`, compare current purple/RGB values, infer related roles from equal colors, or derive repeatedly from an earlier projection. Roles such as general Markdown code outside the hotkeys document, syntax types, custom-message labels, muted borders, custom/tool backgrounds, and thinking-level colors SHALL remain independent unless they explicitly request semantic `accent`, the derived `mdHeading`, `mdListBullet`, dialog `border`, or the subtle derived `selectedBg` and `userMessageBg` surfaces.

A live accent change SHALL invalidate theme-sensitive content and repaint the active frame in the same session, including an accent-derived fullscreen canvas when selected. Every named palette choice SHALL receive the same complete family projection, and a session with no resolved Current color SHALL use blue. `a1 pi` SHALL retain exact Pi theme behavior.

#### Scenario: Apply a selected accent
- **WHEN** bare A1 has an `accentColor` preference
- **THEN** titles, cursors, selected markers, working indicators, accent scrollbars, dialogs, settings controls, and extension theme access that request `accent` SHALL use that choice
- **AND** every owned and retained package dialog bar that requests `border` SHALL use a visibly darker neighboring-hue variation of that choice
- **AND** secondary section/Markdown headings, active dialog-filter values, keyboard-shortcut key spans, and numbered/unordered Markdown list markers SHALL use a brighter complementary neighboring-hue variation distinct from primary titles, with blue and purple receiving the stronger sector-derived separation needed for a clear hierarchy
- **AND** filled scope/default state markers SHALL match the neutral model/item text color
- **AND** selected rows that request `selectedBg` SHALL use a half-strength low-chroma tonal variation closer to the underlying terminal background or selected canvas
- **AND** visible user prompts SHALL use a quieter low-prominence variation
- **AND** resting sticky prompts and jump-to-bottom badges SHALL remain neutral grey while their hovered states use the selection variation
- **AND** every other semantic foreground, component background, emphasis, spacing, and geometry SHALL remain unchanged apart from the independently selected fullscreen canvas

#### Scenario: Change the preference while content is visible
- **WHEN** the reader changes `accentColor` from one allowed value to another
- **THEN** the settings surface and existing shell content SHALL repaint in the same session
- **AND** an accent-derived canvas SHALL repaint from the new accent in that same frame
- **AND** no cached row or later-created accent consumer SHALL retain the previous value
- **AND** ordered and unordered list markers in already-finalized assistant content SHALL repaint to the new secondary/filter tone

#### Scenario: Derive the family from an arbitrary accent
- **WHEN** the owned transform receives a concrete accent that is not one of the named palette entries
- **THEN** border, secondary heading/filter, selected-row, user-message, and optional accent-canvas tones SHALL all derive from that input color
- **AND** no named palette ID or per-role color literal SHALL be required

#### Scenario: Keep the palette stable across an upstream accent change
- **WHEN** the base Pi theme's semantic accent differs from the value used by an earlier Pi release
- **THEN** bare A1 SHALL continue to use its selected explicit palette color for the enumerated accent family
- **AND** every unrelated role SHALL continue to come from the changed base theme

#### Scenario: Retain a selected choice across base-theme replacement
- **WHEN** a preference is active and the base theme reloads or is replaced
- **THEN** the selected accent SHALL be projected once over the new base theme
- **AND** every non-accent role SHALL come from that new base theme

#### Scenario: Preserve comparison parity
- **WHEN** the same base theme is used by `a1 pi`
- **THEN** no A1 accent or canvas projection SHALL be installed
- **AND** pinned Pi theme parity SHALL remain exact

### Requirement: The terminal host and the session presenter are separate owners
One terminal host per process SHALL own the terminal runtime, damage-aware presentation, pointer reporting, owned-route overlays, quit presentation, and terminal restoration, and SHALL hold exactly one active session presenter. A session presenter SHALL own one engine session, its transcript root, editor, controllers, and dialogs, and SHALL reach the terminal only through the host handle. Attaching a presenter SHALL invalidate the retained presentation so its first frame is a full paint, and render requests from a presenter that is not active SHALL NOT paint.

#### Scenario: The single-session product starts
- **WHEN** bare `a1` or `a1 pi` starts
- **THEN** composition SHALL create one host and attach one presenter to it

#### Scenario: A second presenter is attached
- **WHEN** the host attaches a different presenter
- **THEN** the next frame SHALL be a full paint of that presenter and later frames SHALL use incremental damage within the new epoch

#### Scenario: An inactive presenter receives engine events
- **WHEN** a presenter that is not active applies transcript events
- **THEN** its root state SHALL update and no terminal write SHALL occur

### Requirement: The owned shell shows only the restart-ready update status
With `Update` set to `Manual` the shell SHALL show no release-update UI. In `Auto` it SHALL show no availability popup, notice, changelog link, command, or installation progress; once a newer approved same-channel release is active, it SHALL show `Update installed, restart to update` right-aligned in success green on the existing paint-only acknowledgement line above the editor, allocating no row, changing no geometry or transcript, taking no focus, and not dismissible while true.

#### Scenario: Auto installation completes
- **WHEN** a newer approved same-channel release becomes active while the older process is running
- **THEN** the success-green restart-ready status SHALL appear on the existing acknowledgement line without altering live working presentation or geometry

#### Scenario: Result arrives after the first frame
- **WHEN** activation is observed after interaction begins
- **THEN** the status SHALL appear without clearing the editor, moving focus, or interrupting work

#### Scenario: Copy acknowledgement temporarily replaces restart readiness
- **WHEN** successful copy produces `Copied N chars to clipboard` while restart readiness applies
- **THEN** copy feedback SHALL replace the update status for its existing lifetime and the status SHALL return afterward

#### Scenario: Repeated copy acknowledgement retains priority
- **WHEN** another copy succeeds before the previous acknowledgement expires
- **THEN** the newer acknowledgement SHALL replace it and restart its existing lifetime before the update status returns

#### Scenario: Both update notices apply
- **WHEN** A1 update status and extension-package availability both apply in `a1 pi`
- **THEN** A1 status SHALL use its compact region and extension availability SHALL retain its transcript presentation without an added A1 banner

#### Scenario: No newer release
- **WHEN** discovery is skipped, `Manual` is selected, or no newer release exists
- **THEN** no A1 update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** an older Auto-mode process observes an explicit activation performed elsewhere
- **THEN** it SHALL show the same restart-ready status without an availability popup

#### Scenario: The terminal is narrow
- **WHEN** the complete status text does not fit
- **THEN** it SHALL clip safely without changing editor geometry or hiding Working

#### Scenario: The user restarts
- **WHEN** the user exits and runs `a1` again after the status appeared
- **THEN** the new process SHALL execute the active release and SHALL show no restart-ready status

#### Scenario: Automatic update does not succeed
- **WHEN** an attempt fails, remains merely pending, is malformed, or cannot establish certified preparation
- **THEN** no update status or popup SHALL render and the running session SHALL be unaffected

#### Scenario: The comparison profile observes activation
- **WHEN** an older `a1 pi` process observes a newer approved same-channel active release
- **THEN** it SHALL show the same compact status with the same wording and color beside its existing extension-package presentation

### Requirement: Owned indeterminate progress uses the selected stable spinner style
Bare A1 SHALL apply its resolved Spinner style to shared built-in working, retry, compaction, measured-compaction status, extension-provided working text, and A1-owned indeterminate operation loaders. One owned presentation policy SHALL define the available frames and their display geometry. `current` SHALL preserve the existing dot frames and cadence. `circle` SHALL cycle `◐`, `◓`, `◑`, `◒`; `diamond` SHALL cycle `◇`, `◈`, `◆`, `◈`; `square` SHALL cycle `◧`, `◩`, `◨`, `◪`.

Every animated frame SHALL occupy one fixed terminal-cell slot with a consistent adjacent separator so a running animation does not move its label horizontally or change row geometry. `none` SHALL omit the spinner glyph and its separator while retaining the complete status label and existing text treatment. The setting selects glyphs only; it SHALL NOT alter status wording, semantic colors, text highlighting, measured percentages, work-state transitions, cancellation, extension lifecycle, placement, timer cleanup, or disposal.

Measured install/update bars, custom extension-authored renderers, vanilla Pi, installed Pi packages, and the explicit comparison profile SHALL remain unchanged.

#### Scenario: Run each selected animation
- **WHEN** an owned progress surface renders any complete frame cycle of `current`, `circle`, `diamond`, or `square`
- **THEN** its spinner slot and label starting column SHALL remain constant throughout that cycle
- **AND** the glyph SHALL retain the surface's existing semantic color role

#### Scenario: Hide only the spinner
- **WHEN** the effective style is `none`
- **THEN** eligible surfaces SHALL retain their semantic progress text without a spinner glyph or an empty spinner separator
- **AND** their work, cancellation, and completion lifecycles SHALL remain intact

#### Scenario: Change style during active work
- **WHEN** an accepted live setting change selects a new style while work is active
- **THEN** eligible progress surfaces SHALL use the new presentation without restarting the work or multiplying animation timers
- **AND** old presentation resources SHALL be disposed safely

#### Scenario: Preserve determinate and comparison presentation
- **WHEN** installation/update percentage bars, extension-authored custom components, or comparison-profile progress are rendered
- **THEN** the owned Spinner style setting SHALL NOT change those surfaces

### Requirement: Over-width component rows are contained at the terminal boundary
The Pi TUI runtime boundary SHALL NOT end a session because a component returned a row wider than the available width. It SHALL clip such a row to the available width using the pinned renderer's own measurement and continue rendering. Rows that fit SHALL be returned unchanged, and the number of rows per component SHALL NOT change. A clipped row SHALL contain only complete graphemes and SHALL NOT leave an unterminated style or hyperlink. A Kitty image payload on the row SHALL be preserved while the ordinary cells around it are bounded. The runtime boundary SHALL expose how many rows it has contained so that overflow is detectable without a fatal exit.

#### Scenario: Render content the shared geometry under-measures
- **WHEN** a transcript row contains a character that A1's shared width helper measures narrower than the pinned renderer, such as a lone regional indicator, and the row consequently exceeds the terminal width
- **THEN** the session SHALL keep running and the row SHALL occupy at most the terminal width
- **AND** no fatal diagnostic SHALL be written

#### Scenario: Clip a styled over-width row
- **WHEN** an over-width row carries ANSI styling or an OSC hyperlink across the clip position
- **THEN** the clipped row SHALL NOT split a grapheme
- **AND** styling and hyperlink state SHALL NOT leak into following rows

#### Scenario: Bound ordinary cells beside an image payload
- **WHEN** a row carries a Kitty image payload followed by more ordinary cells than the available width
- **THEN** the payload SHALL be preserved and the ordinary cells SHALL be clipped to the available width

#### Scenario: Leave fitting rows untouched
- **WHEN** every row a component returns fits the available width
- **THEN** the boundary SHALL return those rows unchanged and SHALL NOT increase the contained-row count

#### Scenario: Detect overflow without a fatal exit
- **WHEN** a root, mounted, or overlay component returns an over-width row
- **THEN** the contained-row count SHALL increase
- **AND** rendering SHALL NOT throw

### Requirement: Bare A1 declares shared input and status-level presentation
Bare A1 SHALL use the shared input presentation and status-level color behavior as an explicit A1-owned customization over the pinned shell. The ordinary main user prompt SHALL be marker-free and SHALL keep a blank gutter of at least one cell on each side of every editable row. Bare-A1 standard dialog search inputs SHALL render exact ASCII `> ` before their caret or query, with the `>` resolved through the live semantic accent role. Marker-free full-screen application search and compact non-search text-entry inputs SHALL continue using the reusable rules, caret, placeholder, and content geometry without a dialog marker. This customization SHALL replace pinned editor border coloring and thinking-label styling only in bare A1; it SHALL render shared input rules through the same active semantic `border` role as modal bars and SHALL NOT change pinned `a1 pi` presentation, extension-provided custom editors, engine semantics, or other footer values. Bare-A1 keyboard defaults SHALL follow the declared level-cycle and model-selector shortcut policy instead of pinned defaults.

#### Scenario: Open the pinned comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** editor thinking-level and bash-mode border colors, footer presentation, Shift+Tab level cycling, Ctrl+L model selection, and input prefixes SHALL retain pinned behavior

#### Scenario: Use the owned agent input
- **WHEN** the user starts bare A1 with its default agent editor
- **THEN** the input SHALL use the shared modal-border rules and render no prompt marker, with a blank gutter of at least one cell before the text
- **AND** prompt history, paste chips, selection and copy, suggestions, streaming, submission, and bash execution SHALL retain their existing semantics

#### Scenario: Use a standard dialog search input
- **WHEN** a bare-A1 standard dialog offers typing-based search
- **THEN** its input SHALL render exact ASCII `> ` with the `>` in the active semantic accent role
- **AND** focus, editing, filtering, submission, cancellation, IME placement, clipping, and pointer geometry SHALL remain unchanged

#### Scenario: Use an auxiliary Agent input
- **WHEN** an A1-owned Agent standard selector or dialog offers typing-based search
- **THEN** the input SHALL render exact ASCII `> ` with the `>` in the active semantic accent role
- **WHEN** full-screen Settings search or an explicitly marker-free compact non-search text-entry surface requests the shared input presentation
- **THEN** the input SHALL render its caret, placeholder, and text without an agent or dialog prompt marker
- **AND** each surface's existing focus, editing, submission, and cancellation behavior SHALL remain unchanged

#### Scenario: Change the owned accent live
- **WHEN** the active bare-A1 accent changes while the default agent editor or a standard dialog search input is visible
- **THEN** shared input rules SHALL repaint with the same derived border tone as modal rules
- **AND** a visible standard-dialog `>` SHALL repaint with the new semantic accent
- **AND** the input SHALL retain its text, cursor, selection, focus, prefix choice, and geometry

## REMOVED Requirements

### Requirement: The owned shell presents the complete pinned Pi interactive UI
**Reason**: Mixed current behavior with parity gates and evidence scenarios, and left unscoped scenarios (`/settings`, `/hotkeys`, `/changelog`, `/scoped-models`, regular-mode terminal ownership, an application over regular mode) that bare A1 no longer follows: bare A1 always runs fullscreen and reaches Settings, Changelog, and Hotkeys through the Launcher and models through `/models`.

**Migration**: Replaced by "The owned shell reproduces pinned Pi interactive behavior outside declared A1 replacements". Bare-A1 replacements are kept by "Bare A1 unifies model selection and scope management" and "Changelog and Hotkeys applications present packaged release notes and live keybinding sections" in this capability, `custom-session-viewport` "Bare A1 uses a fixed fullscreen terminal surface", `ui-apps` "Application destinations are separate from Agent built-in commands", and `ui-components` "Pointer reporting is enabled only while a screen needs it".

### Requirement: Visible Pi extension UI is part of the 1:1 baseline
**Reason**: Its last scenario specified a parity gate rather than product behavior, and the name described a delivery baseline.

**Migration**: Replaced by "Visible Pi extension UI crosses A1-owned boundaries", which keeps the product scenarios.

### Requirement: The pinned Pi version has exact observable parity before product work
**Reason**: Acceptance and evidence procedure only (independent producers, parity gate, the `npm run test:pi-terminal-parity` script that no longer exists); it described a delivery phase before product work.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow.

### Requirement: Every pinned interactive behavior has traceable port coverage
**Reason**: Process only: a source-mapping ledger, attribution review, and upgrade review procedure for "the change".

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Upgrade compatibility behavior is kept by `pi-api-boundary` "Pi compatibility is validated explicitly and fails closed".

### Requirement: Customization remains disabled above the 1:1 baseline until acceptance
**Reason**: A finished phase gate: A1 customizations are enabled, and the remaining text specified acceptance prerequisites.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow.

### Requirement: Contradictory manual findings invalidate completion claims
**Reason**: Task and evidence bookkeeping for manual acceptance, not product behavior.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow.

### Requirement: Provider authentication and model availability remain consistent
**Reason**: Its last scenario specified acceptance evidence, and one scenario described parity comparison procedure.

**Migration**: Replaced by "Provider authentication state determines model availability", which keeps the product scenarios.

### Requirement: Declared A1-owned additions and replacements extend the accepted baseline
**Reason**: Specified how parity comparison classifies surfaces and a pre-acceptance availability gate; the reachability rule for replacements is stated by the shell baseline requirement.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. The rule that a replacement keeps every capability of the route it supersedes is kept by "The owned shell reproduces pinned Pi interactive behavior outside declared A1 replacements".

### Requirement: Session viewport interaction has a focused owner
**Reason**: Narrated a finished extraction ("after extraction") and duplicated the controller ownership rule.

**Migration**: Covered by `owned-ux-architecture` requirement "Stateful interaction policy is separate from surface composition" and `custom-session-viewport` requirement "The custom viewport is scoped to bare A1".

### Requirement: The declared bare-A1 viewport customizes layout without replacing shell behavior
**Reason**: Phase-gated on acceptance of the baseline, ended with a milestone-acceptance scenario, and duplicated the viewport scoping rule.

**Migration**: Covered by `custom-session-viewport` requirement "The custom viewport is scoped to bare A1" and `pi-api-boundary` requirements "Production Pi integration uses documented public APIs only" and "Retained Pi-derived presentation is A1-owned and independent of engine upgrades".

### Requirement: Comparative input responsiveness has independent evidence
**Reason**: Evidence and acceptance procedure only (producer matrix, budgets, physical-terminal acceptance).

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Input behavior is kept by "Keyboard input reaches an immediate current-state presentation".

### Requirement: The owned shell preserves setting-controlled Pi behavior
**Reason**: Duplicated the setting-application contract of the more specific capability and ended with an acceptance gate.

**Migration**: Covered by `pi-settings-runtime` requirements "Writable Pi settings have an observable application contract", "Owned-shell presentation settings update their real components", "Renderable image content survives the owned transcript boundary", "Fullscreen exit output is emitted after terminal restoration", and "Project trust is decided before project resources load".

### Requirement: Setting-controlled owned surfaces preserve pinned Pi visual semantics
**Reason**: Contradicted by code and partly evidence procedure: every declared setting belongs to the Generic, Appearance, Scroll, History, or Agent section, so no "A1" section is shown, search opens on typing rather than staying closed until `/`, and two scenarios specified parity evidence and physical-terminal acceptance.

**Migration**: Covered by `owned-ui-settings` requirements "The settings screen uses the framed A1 visual hierarchy", "The in-shell settings screen renders the section model", "The settings list scrollbar follows the shared scrollbar settings", and "Scalar value menus align choices with the source value"; `pi-settings-runtime` requirements "Owned-shell presentation settings update their real components" and "Project trust is decided before project resources load".

### Requirement: Bare A1 progress indicators use the shared component presentation
**Reason**: Contradicted by code and superseded: bare A1 progress labels end in one Unicode ellipsis (`…`), not three ASCII periods.

**Migration**: Covered by "Bare A1 progress labels share one quiet animated presentation" in this capability and `ui-components` requirement "Spinner-backed progress text has one canonical marker".

### Requirement: Persistent prompt history is a declared bare-A1 editor replacement
**Reason**: Duplicated the persistent-history capability and carried an evidence-evaluation scenario and version jargon.

**Migration**: Covered by `persistent-prompt-history` requirements "Prompt history is stored per profile under one history root" (disabled persistence and the comparison profile), "History navigation places the caret by direction and restores the draft", and "History position is shown in the existing editor border"; the editor boundary is kept by "The history-enabled default editor is an owned typed adaptation".

### Requirement: The owned history editor has a bounded typed and source-traced boundary
**Reason**: Two scenarios specified a finished enablement gate and an acceptance-blocking provenance review rather than product behavior.

**Migration**: Replaced by "The history-enabled default editor is an owned typed adaptation", which keeps the product scenarios.

### Requirement: Content-retention evidence uses production lifecycle and presentation boundaries
**Reason**: Evidence and acceptance procedure only.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Run completion preserves the active transcript continuously" and "Tool argument completion does not finalize execution".

### Requirement: Command-message parity has outcome-complete independent evidence
**Reason**: Evidence inventory and acceptance procedure only; it also named a Pi version (0.84.2) that is not the pinned one.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Command outcome messages retain pinned wording and severity".

### Requirement: Rendering evidence covers code and link-bearing streaming
**Reason**: Evidence workloads and budgets only.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Link inspection separates movement risk from hover cleanup" and "The real-damage allowance follows the declared live tail".

### Requirement: Trust path parity retains independent styled-row evidence
**Reason**: Evidence capture matrix and parity gate only.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Project trust options use canonical filesystem identities".

### Requirement: Quiet pressure handling has combined correctness evidence
**Reason**: Acceptance procedure for "the change" only.

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Pressure handling remains cooperative and invisible to ordinary users".

### Requirement: Rendering stability is proven from terminal paint evidence
**Reason**: Evidence and validation procedure only (producers, checkpoints, gate failure).

**Migration**: None; delivery and acceptance are owned by the shared delivery workflow. Behavior is kept by "Damage-aware painting uses an A1-owned public boundary" and "Stream presentation cadence is bounded without changing semantics".

### Requirement: The changelog and hotkeys commands open reference screens in bare A1
**Reason**: Contradicted by code. Bare A1 has no `/changelog` or `/hotkeys` Agent commands; both are
applications opened from the Launcher (`OWNED_BUILTIN_SLASH_COMMANDS` and `OWNED_WORKFLOW_COMMAND_NAMES` drop
them, and the session shell does not let the route host claim them).
**Migration**: Command separation is covered by `ui-apps` requirement "Application destinations are separate
from Agent built-in commands"; the screen itself by `ui-apps` "A reference screen presents a read-only document
full screen"; document content and titles by "Changelog and Hotkeys applications present packaged release
notes and live keybinding sections" in this capability.

### Requirement: Bare-A1 dialogs share one shortcut-hint presentation
**Reason**: Duplicated the key/action styling and heading alignment owned by `ui-components`, narrated history
("previously omitted", "add omitted close guidance"), carried an inventory-coverage audit scenario, and claimed
every nested return reads `Esc close` although a nested step shows `Esc back`.
**Migration**: Styling, spacing and alignment are covered by `ui-components` requirement "Dialog shortcut rows
distinguish keys from actions without separator glyphs"; the dismissal wording by "Dismissible bare-A1 surfaces
end their shortcut guidance with Esc close" in this capability. Coverage audits are owned by the shared delivery
workflow.

### Requirement: Bare-A1 titled modals use compact shared top chrome
**Reason**: Duplicate of the modal-frame component requirement, with inventory-coverage and validation-gate
scenarios that describe delivery checks rather than product behaviour.
**Migration**: Covered by `ui-components` requirement "Modal frames place titles directly below their top rule"
and `owned-ux-architecture` requirement "A screen composes shared components and draws no chrome of its own".
