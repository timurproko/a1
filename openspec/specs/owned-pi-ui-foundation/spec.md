# Owned Pi UI Foundation Specification

## Purpose

Defines A1's independently owned Pi shell with vanilla-default regular main-screen mode and optional fullscreen mode, complete pinned interactive baseline including extension UI, exact current-version parity, public engine/runtime boundaries, customization slots, diagnostics, and upgrade-conformance policy.

## Requirements

### Requirement: The owned shell presents the complete pinned Pi interactive UI
The A1-owned UI SHALL reproduce the complete visible and interactive behavior of pinned Pi `0.87.0` at commit `16787ad5b2dc748047f314ca1bfe7708f30f54f3`. The baseline SHALL include startup composition, themes, colors, spacing, layout, editor, autocomplete, keybindings, commands, prompt execution, transcript, streaming, tools, selectors, dialogs, settings, sessions, models, thinking, status/footer state, clipboard, resize, errors, and shutdown. A1 SHALL NOT substitute approximate layouts, colors, controllers, or workflows for covered pinned behavior. After parity acceptance a route MAY be superseded by a declared A1-owned replacement; the pinned behavior of a superseded route SHALL remain provable through `a1 pi`, and every capability the pinned route exposed SHALL remain reachable from its replacement.

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

### Requirement: Visible Pi extension UI is part of the 1:1 baseline
The owned UI SHALL support the visible behavior exposed by pinned Pi extensions, including widgets, custom editors and inputs, selectors, dialogs, notifications, status and footer contributions, custom message and tool renderers, terminal input hooks, working indicators, and lifecycle cleanup. Extension UI behavior SHALL cross A1-owned versioned boundaries and SHALL NOT require mutation of installed Pi code or private interactive state.

#### Scenario: Extension contributes a visible surface
- **WHEN** a compatible pinned Pi extension registers a supported visible contribution
- **THEN** the owned UI SHALL present and update that contribution with equivalent focus, input, rendering, cancellation, and cleanup behavior

#### Scenario: Extension surface fails
- **WHEN** one extension renderer, input handler, or lifecycle callback throws or returns malformed data
- **THEN** A1 SHALL isolate the failure, restore the baseline editor and focus, report the error, and preserve the rest of the session

#### Scenario: Extension requests an unmapped visual capability
- **WHEN** a pinned visible extension capability is not yet bridged through an A1-owned boundary
- **THEN** the parity gate SHALL fail rather than silently omitting the surface or reporting complete extension support

### Requirement: The pinned Pi version has exact observable parity before product work
The first accepted presentation SHALL match pinned Pi for visible rows, ANSI styling, colors, spacing, wrapping, component order, focus, editor state, selectors, dialogs, status/footer state, command availability and outcomes, prompt effects, event transitions, terminal progress, resize, errors, extension surfaces, and lifecycle behavior. Evidence SHALL use independent pinned-Pi and A1 producers. A1-only snapshots and synthetic-only sessions MAY serve as regression fixtures but SHALL NOT establish parity.

#### Scenario: Rendering differs
- **WHEN** equivalent pinned-Pi and A1 states produce a different visible row, style, color, spacing, wrapping, selector, dialog, status, footer, or extension surface outside an approved terminal-only tolerance
- **THEN** the parity gate SHALL fail

#### Scenario: Workflow differs
- **WHEN** a command, keybinding, prompt, queue action, clipboard action, model/session/settings flow, extension interaction, or shutdown path has a different observable outcome
- **THEN** the parity gate SHALL fail

#### Scenario: Evidence has only one producer
- **WHEN** expected and actual results are both derived from A1 implementation code or A1-authored synthetic state
- **THEN** the result SHALL be classified as regression evidence and SHALL NOT satisfy parity

#### Scenario: Run the automated terminal parity gate
- **WHEN** a completed pinned-UI change is integrated into develop or its parity-affecting behavior is released
- **THEN** `npm run test:pi-terminal-parity` SHALL independently launch untouched pinned Pi and the A1-owned UI, apply equivalent deterministic terminal state and actions, compare all declared checkpoints, and pass once for that change
- **AND** individual tasks within the change SHALL require only focused tests for the touched behavior, not the parity gate

#### Scenario: Compare deterministic terminal sessions
- **WHEN** a terminal parity scenario depends on resources, prior messages, model output, streaming, tools, or settlement
- **THEN** both producers SHALL receive the same isolated configuration, cwd, geometry, capabilities, prepared session replay or deterministic scripted model stream, resource set, and input sequence without deriving the untouched expected output from A1 code

#### Scenario: Detect a terminal divergence
- **WHEN** equivalent checkpoints differ in visible rows, ANSI colors or styles, spacing, wrapping, focus, cursor, scroll destination, scrollbar, component geometry, startup resources, editor, transcript, footer/status, selector/dialog, error, resize, or lifecycle state outside a named terminal-only tolerance
- **THEN** the automated terminal parity command SHALL fail and produce bounded machine-readable and human-readable difference artifacts

#### Scenario: Terminal parity producer fails or times out
- **WHEN** either independent process exits unexpectedly, hangs, fails a checkpoint, or exceeds its bounded deadline
- **THEN** the gate SHALL fail, preserve diagnostics, restore terminal state, and terminate both isolated process trees without affecting production terminal ownership

### Requirement: Every pinned interactive behavior has traceable port coverage
The change SHALL maintain an exhaustive, machine-verifiable mapping from the pinned interactive source baseline to A1 behavior, tests, provenance, local modifications, and approved deviations. Every copied or adapted MIT-licensed source unit SHALL retain required attribution. Deviations SHALL be limited to public engine/runtime boundaries, A1 ownership contracts, platform terminal integration, and removal of private mutation or inspection.

#### Scenario: Source behavior is unmapped
- **WHEN** a pinned interactive module, controller path, component state, extension surface, or lifecycle branch lacks a recorded destination and acceptance case
- **THEN** source-port coverage SHALL fail

#### Scenario: Deviation is undocumented
- **WHEN** A1 changes covered behavior without an approved reason, affected acceptance case, and upstream source reference
- **THEN** source-port coverage SHALL fail

#### Scenario: Upgrade the pinned Pi version
- **WHEN** A1 evaluates a newer Pi package
- **THEN** the source mapping, public adapter conformance, independent parity evidence, and approved-deviation ledger SHALL be regenerated and reviewed before release

### Requirement: Public engine and terminal authority remain behind A1 boundaries
The owned UI SHALL use documented public Pi engine and terminal contracts through A1-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout A1 workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries. The engine adapter SHALL be a facade over adapter-owned components, each reachable through explicit ports and testable without an engine: the runtime and session lifecycle (creation, generations, subscription, disposal order), transcript projection, event delivery, session event translation, command dispatch, workflows and their selector contexts, provider authentication, settings, resource discovery, prompt suggestions, and the extension UI binding. The adapter alone SHALL own the view model, editor and status state, and the wiring between those components. The owned session shell SHALL take its composition as options grouped by the collaborator that provides them (engine, presentation, history, suggestions, diagnostics) so that each composition profile states what it supplies and a fixture can supply one group without the others.

#### Scenario: Pinned private interactive code is installed
- **WHEN** the Pi package contains stock interactive classes or private renderer state
- **THEN** A1 SHALL operate without constructing, patching, or inspecting those internals

#### Scenario: Exact behavior requires a coupled source unit
- **WHEN** covered behavior cannot be reused through a documented public contract
- **THEN** A1 SHALL port the minimum coherent source unit with provenance and an A1-owned boundary rather than deep-importing or patching it

#### Scenario: Drive an engine component without the adapter
- **WHEN** the runtime lifecycle, command dispatch, session event translation, settings port, resource catalog, prompt suggestions, extension UI binding, or provider authentication is driven directly with fake sessions, runtimes, and ports
- **THEN** it SHALL produce the same generations, outcomes, work-state transitions, snapshots, resource summaries, suggestions, bindings, and wording the shell observes through the adapter
- **AND** the adapter SHALL stay under 800 lines with no engine module over 600

#### Scenario: Compose a shell from grouped options
- **WHEN** the bare-A1 composition, a comparison profile, or a test fixture constructs the owned session shell
- **THEN** it SHALL pass the engine group and only the presentation, history, suggestions, and diagnostics groups it provides
- **AND** the shell SHALL behave exactly as it did with the same seams supplied flat

### Requirement: Customization remains disabled above the 1:1 baseline until acceptance
A1-specific themes, components, commands, layouts, structured tabs, and multi-agent presentation SHALL remain disabled until the complete pinned built-in and extension UI baseline passes source coverage, independent parity, real-prompt integration, and fresh manual acceptance. After acceptance, customization SHALL resolve through versioned A1-owned slots without mutating the baseline implementation or installed Pi code.

#### Scenario: Request customization before parity
- **WHEN** an A1-specific visual or layout customization is requested before 1:1 acceptance
- **THEN** the capability SHALL remain unavailable

#### Scenario: Apply customization after parity
- **WHEN** the accepted baseline receives a supported A1 customization
- **THEN** the customization SHALL resolve through an owned slot and preserve ordinary built-in and extension session behavior

#### Scenario: Reject customization while architecture debt remains
- **WHEN** any source-ledger record names an absent planned destination or stale review status, any visible route can fall back to a generic workflow presenter, any prompt-adjacent row is changed by rendered-string substitution, or production Pi adapters rely on reflection or unchecked type escapes
- **THEN** the customization prerequisite SHALL fail even when visible vanilla parity has been manually accepted

#### Scenario: Validate the customization-ready vanilla baseline
- **WHEN** architecture-debt closure runs
- **THEN** every pinned source unit SHALL identify a real public reuse, host adapter, or present owned port; every approved deviation SHALL remain explicit; engine and component boundaries SHALL use validated typed façades; and shell composition SHALL be split into bounded responsibility modules
- **AND** the untouched-Pi terminal producer, full tests, real integration, packaging, and the accepted manual-baseline invariants SHALL remain unchanged

### Requirement: Contradictory manual findings invalidate completion claims
A user-controlled finding that a covered prompt, command, visual state, extension surface, or lifecycle path is missing or divergent SHALL invalidate any task completion or evidence claim contradicted by that finding. The affected task SHALL be reopened, corrected, and revalidated before later acceptance or publication tasks proceed.

#### Scenario: Prompt submission produces no working turn
- **WHEN** manual testing shows that an ordinary prompt does not visibly execute and complete despite automated tests passing
- **THEN** prompt and event orchestration tasks SHALL be treated as incomplete and downstream parity evidence SHALL be rejected

#### Scenario: Layout or color differs
- **WHEN** manual comparison against `a1 pi` shows undocumented differences in layout, spacing, colors, or component composition
- **THEN** composition and visual parity tasks SHALL be reopened until independent captures prove equivalence

### Requirement: Provider authentication and model availability remain consistent
The owned Pi UI SHALL derive visible provider configuration, available models, active model selection, footer state, login/logout choices, and restart recovery from the same authoritative provider-auth state used by pinned Pi for the selected profile. Models SHALL be selectable only when their provider is currently configured according to that authority. Persisted credentials SHALL remain profile-local and SHALL count as an authenticated state across launches until logout or invalidation; an empty profile SHALL NOT inherit models or credentials from another profile, settings history, a prior process, or a cached catalog.

#### Scenario: Start with an empty A1 profile
- **WHEN** bare A1 starts with no stored, environment, runtime, or provider-config authentication and no equivalent configured provider
- **THEN** it SHALL report that no models are available, `/models` SHALL contain no selectable provider models, `/login` SHALL show providers as unconfigured, and the footer SHALL NOT present a stale active model

#### Scenario: Start with stored credentials
- **WHEN** bare A1 starts with valid credentials stored in its own profile for one or more providers
- **THEN** `/login` SHALL identify those providers with the same configured type and source status as pinned Pi, `/models` SHALL expose only models from currently configured providers, and selected-model and footer state SHALL agree with that catalog

#### Scenario: Keep A1 and vanilla profiles isolated
- **WHEN** `~/.a1/agent` and `~/.pi/agent` contain different authentication records
- **THEN** bare `a1` and `a1 pi` SHALL each use only its selected profile, and parity comparison SHALL use equivalent prepared state rather than copying or silently sharing credentials between profiles

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

#### Scenario: Prove authentication and model parity independently
- **WHEN** this requirement is accepted
- **THEN** untouched pinned Pi and A1 SHALL be run with equivalent isolated profile fixtures for empty, stored OAuth, stored API-key, non-stored configuration, logout, stale setting, refresh failure, and restart cases, and credential values SHALL NOT be copied into evidence

### Requirement: Declared A1-owned additions and replacements extend the accepted baseline
After parity acceptance, A1 MAY present surfaces, commands, and content that pinned Pi does not have, and MAY supersede a specific pinned route with an A1-owned replacement. Every such surface SHALL be declared, as an addition or as a replacement naming the route it supersedes. A declared addition SHALL NOT replace, reorder, restyle, intercept, or change the reachability of any pinned surface. A declared replacement SHALL keep every capability of the route it supersedes reachable, and SHALL leave every other pinned surface untouched. Parity comparison SHALL evaluate every pinned surface that is neither declared as replaced nor part of a declaration against pinned Pi, SHALL treat a declared addition or replacement as expected rather than as divergence, and SHALL fail on an undeclared one. The classification SHALL be derived from the declaration rather than from a separately maintained exclusion list.

#### Scenario: Declare and present an A1-owned addition
- **WHEN** an accepted A1-owned surface is declared as an addition and the user reaches it through its A1-owned route
- **THEN** it SHALL open, and every pinned surface SHALL remain reachable and unchanged

#### Scenario: Declare and present an A1-owned replacement
- **WHEN** an accepted A1-owned surface is declared as the replacement for a named pinned route and the user invokes that route
- **THEN** the replacement SHALL open, every capability the pinned route exposed SHALL remain reachable from it, and no other pinned surface SHALL change

#### Scenario: Compare parity with a declared surface present
- **WHEN** parity comparison runs against pinned Pi while a declared addition or replacement exists
- **THEN** every pinned surface outside the declarations SHALL still be required to match pinned Pi, and the declared surface SHALL NOT be reported as a divergence

#### Scenario: Classification follows the declaration
- **WHEN** a declared replacement is added or removed
- **THEN** the parity classification SHALL follow from the declaration without editing a separate exclusion list

#### Scenario: Encounter an undeclared surface
- **WHEN** a surface, command, or content region diverges from pinned Pi without being declared
- **THEN** parity SHALL fail

#### Scenario: Addition displaces pinned behavior
- **WHEN** a surface declared as an addition replaces, reorders, restyles, or intercepts a pinned surface, or inserts itself into a pinned surface content, options, or command list
- **THEN** parity SHALL fail even though the surface itself is declared

#### Scenario: Replacement drops a superseded capability
- **WHEN** a declared replacement omits a capability that the route it supersedes exposed
- **THEN** parity SHALL fail and the replacement SHALL remain unaccepted

#### Scenario: Declared surface requested before acceptance
- **WHEN** an A1-owned addition or replacement is requested while the customization prerequisite is unmet
- **THEN** it SHALL remain unavailable, as the customization requirement already provides

### Requirement: Startup consumes the pinned model scope and update-probe configuration

The owned runtime SHALL resolve the profile's `enabledModels` settings patterns
at startup exactly as pinned Pi's CLI does, and the owned shell SHALL run
pinned Pi's startup extension-package update probe. Configuration pinned Pi
acts on at startup SHALL NOT be silently ignored by the owned surface.

#### Scenario: Warn about unmatched model patterns

- **WHEN** an `enabledModels` pattern in the profile's settings matches no
  available model at startup
- **THEN** the owned UI SHALL surface pinned Pi's
  `No models match pattern "<pattern>"` warning as a startup diagnostic

#### Scenario: Render startup diagnostics in pinned style and position

- **WHEN** startup diagnostics exist when the owned shell renders
- **THEN** every startup diagnostic SHALL render above the banner in pinned
  `reportDiagnostics` style — the whole line in chalk's basic ANSI severity
  colour (yellow warning, red error, dim info), not the theme's tokens, with
  the `Warning: ` or `Error: ` prefix and info lines unprefixed
- **AND** no startup diagnostic SHALL be dropped by a display cap

#### Scenario: Apply the configured model scope

- **WHEN** `enabledModels` patterns resolve to one or more available models
  and a fresh session starts
- **THEN** the session's scoped model list SHALL be the resolved scope
- **AND** the initial model SHALL be the saved default model when it is in
  scope, otherwise the first scoped model, as in pinned Pi

#### Scenario: Announce available extension-package updates

- **WHEN** the startup probe finds extension packages with available updates
- **THEN** the owned UI SHALL render pinned Pi's notification banner —
  warning-coloured dynamic borders around the bold `Package Updates Available`
  title, the muted instruction with the accent `a1 pi update --extensions`
  command, and the package list — after the banner and loaded resources
- **AND** with `PI_OFFLINE` set, or when the probe fails, no notice SHALL
  appear

### Requirement: Session viewport interaction has a focused owner
The Pi-backed owned shell SHALL keep custom-viewport interaction state and input policy in a focused viewport controller separate from the shell root that composes transcript document and dock rows. The extraction SHALL preserve the accepted bare-A1 frame, follow/detach behavior, prompt navigation, scrollbar, pointer selection, copy, editor pointer handling, modal bypass, resize, and terminal-restoration behavior. The pinned comparison path SHALL remain unchanged.

#### Scenario: Render bare A1 after extraction
- **WHEN** bare A1 renders the custom session viewport for the same session, terminal, theme, and settings state
- **THEN** the complete frame and hit regions SHALL remain the accepted custom-viewport result
- **AND** the viewport controller SHALL own the interaction state used to produce it

#### Scenario: Route input after extraction
- **WHEN** the viewport receives wheel, pointer, transcript-copy, prompt-navigation, editor, or unrelated keyboard input
- **THEN** its consume/transform result and resulting state SHALL remain unchanged
- **AND** unrelated input SHALL still reach the focused Pi surface

#### Scenario: Use the pinned comparison profile
- **WHEN** the same shell runs without the custom viewport
- **THEN** the pinned root/layout and input behavior SHALL remain unchanged
- **AND** the extracted viewport controller SHALL not claim pinned-profile interaction

### Requirement: The declared bare-A1 viewport customizes layout without replacing shell behavior
After the pinned shell baseline and customization prerequisite are accepted, bare A1 SHALL apply the custom session viewport as a declared layout customization over the owned shell's existing engine, transcript components, input surfaces, status/footer components, extension bridge, commands, selectors, dialogs, and lifecycle. The customization SHALL own viewport composition and navigation but SHALL NOT patch installed Pi code, inspect private Pi renderer state, infer transcript semantics from rendered terminal text, or introduce a second agent or terminal authority.

The viewport's intentional differences SHALL be limited to its declared capability: a bounded transcript above a pinned dock, A1 scrollbar presentation, detached/follow navigation, the scroll-to-bottom control, and timestamped sticky submitted prompts. Correct text or behavior from an existing shell surface SHALL NOT be reimplemented as viewport-specific status, editor, workflow, or extension behavior.

#### Scenario: Compose the custom viewport
- **WHEN** bare A1 starts after the customization prerequisite is satisfied
- **THEN** the viewport SHALL compose the accepted owned-shell surfaces through their existing public A1 boundaries
- **AND** the docked status, input, footer, commands, modal surfaces, and extension contributions SHALL keep their existing behavior

#### Scenario: Open a pinned workflow from the custom viewport
- **WHEN** the reader invokes a command, selector, dialog, authentication flow, session flow, or extension interaction not declared as replaced
- **THEN** its controller, result, cancellation, focus restoration, and lifecycle SHALL remain the accepted pinned-shell behavior

#### Scenario: Compare an explicit profile
- **WHEN** `a1 pi` is started
- **THEN** the declared viewport layout customization SHALL be absent
- **AND** those profiles SHALL remain suitable for observing the pinned presentation without A1 viewport rows, controls, prompt timestamps, or scrollbar settings

#### Scenario: Upgrade the pinned integration
- **WHEN** the pinned Pi or Pi TUI version changes
- **THEN** the viewport SHALL continue to depend only on documented public runtime/component contracts and A1-owned ports
- **AND** an unabsorbed input, layout, or component-boundary change SHALL fail conformance rather than being handled through a private-field or prototype workaround

#### Scenario: Viewport customization is not yet accepted
- **WHEN** its implementation, focused regression evidence, or user-controlled manual acceptance is incomplete or contradicted
- **THEN** the custom viewport milestone SHALL remain unaccepted
- **AND** that incomplete milestone SHALL NOT authorize the held multi-agent workspace work

### Requirement: Compact extension labels preserve source identity

The owned startup Extensions section SHALL use pinned Pi's compact naming rules
rather than reducing every loaded extension to the final segment of its entry
path.

#### Scenario: Show an extension supplied by an npm package

- **WHEN** an npm package supplies an extension below its package root
- **THEN** the compact label SHALL contain the configured npm package source and
  the meaningful entry suffix, omitting a terminal `index.ts` or `index.js`
- **AND** `npm:@narumitw/pi-statusline` loaded from `dist/index.ts` SHALL appear
  as `@narumitw/pi-statusline:dist`, not `dist`

#### Scenario: Show a package-root index

- **WHEN** an npm or Git package supplies its root `index.ts` or `index.js`
- **THEN** the compact label SHALL be the package identity without an `index`
  suffix

#### Scenario: Disambiguate local extension entries

- **WHEN** two visible non-package extensions would have the same compact leaf
  label
- **THEN** each label SHALL include the shortest trailing path that uniquely
  identifies it, with a terminal directory index omitted as pinned Pi omits it

#### Scenario: Keep hidden extensions out of label resolution

- **WHEN** a loaded extension is marked hidden
- **THEN** it SHALL remain absent from the startup Extensions section and SHALL
  NOT force a longer label for a visible extension

### Requirement: Streaming output does not cost the shell its responsiveness
The owned shell SHALL remain responsive while the agent streams. The work it performs for
one engine event SHALL NOT grow with the number of transcript blocks already present, and
engine events SHALL be delivered so the runtime's event loop turns between batches rather
than after the burst has drained. Typed input SHALL be serviced while output arrives, and
a pending frame SHALL NOT delay it. Rendering SHALL be coalesced to the runtime's frame
interval rather than performed once per streamed update.

A transcript block that has not changed SHALL NOT be re-rendered to produce a frame, and
locating the block an event refers to SHALL NOT scan the transcript.

#### Scenario: Type while the agent streams
- **WHEN** the user types, submits, or invokes a command while the agent is streaming output
- **THEN** the keystroke SHALL be accepted and shown without waiting for streaming to stop

#### Scenario: Stream into a long transcript
- **WHEN** the agent streams into a session that already holds a large transcript
- **THEN** the work performed per streamed update SHALL be equivalent to the work performed
  for the same update in an empty session
- **AND** the shell SHALL NOT become progressively less responsive as the session grows

#### Scenario: Timed indicators keep running
- **WHEN** an indicator animates on a timer while the agent streams
- **THEN** it SHALL continue to animate rather than stalling until the run ends

#### Scenario: Pointer input during streaming
- **WHEN** the terminal reports pointer input while the agent streams
- **THEN** it SHALL be handled at the time it arrives rather than after the run ends

### Requirement: Working state is cleared only by the event that ends the work
The owned shell SHALL treat entering a working, retrying, or compacting state and leaving it
as separate transitions, each ended only by the event that ends that work. A retry finishing
or a compaction finishing SHALL NOT clear a state it did not start, and neither SHALL be
reported as the session becoming idle while the run continues.

Clearing SHALL be scoped to the state being cleared, so ending one kind of work leaves any
other kind still standing. Ending a turn SHALL leave the working state, as the recorded
pinned baseline does; the engine ends a turn for every continuation it makes — a retry, a
compaction, a queued message — and reports the run settled once, when its loop is done, so
settlement is what ends the run.

#### Scenario: A turn ends while a compaction is shown
- **WHEN** a turn ends while the compaction state is the one being shown
- **THEN** the compaction state SHALL remain shown rather than being cleared by the turn

#### Scenario: Automatic compaction inside a turn
- **WHEN** compaction starts and finishes while the turn continues
- **THEN** the compaction indicator SHALL be shown for its duration and removed at its end
- **AND** the working state SHALL be the one shown once compaction ends, without waiting for
  a further prompt

#### Scenario: Automatic retry inside a turn
- **WHEN** a retry starts and finishes while the turn continues
- **THEN** the retry indicator SHALL be removed at its end and the working state SHALL stand

#### Scenario: Run settles
- **WHEN** the engine reports the run settled
- **THEN** the working state SHALL be cleared and the session SHALL be reported as ready

#### Scenario: Compaction outside a run
- **WHEN** a compaction starts and finishes while no run is active
- **THEN** the compaction state SHALL be cleared and the session SHALL be reported as ready
  rather than as working

#### Scenario: Content continues after a cleared indicator
- **WHEN** transcript content is still arriving
- **THEN** the shell SHALL NOT present the session as idle

### Requirement: A streaming tool execution costs frames, not chunks
While a tool execution streams output, the owned shell SHALL bound its work by the frame
cadence rather than by the number of output chunks the engine reports. Partial results
that arrive faster than a frame SHALL be coalesced so that only the newest accumulated
output and supported rendering metadata per tool call are applied, and the work performed
to apply one partial SHALL NOT re-serialize or re-summarize the whole accumulated output.
A tool execution's final result SHALL supersede any partial still waiting, and SHALL be
applied without waiting for the coalescing interval. Completion of generated arguments
SHALL NOT be treated as execution completion for this policy.

Applying one streamed block SHALL invalidate only that block's rendered state and its
dependent layout; the other components' caches SHALL survive the chunk. Reading the view
during a stream SHALL NOT recompute derived session aggregates (usage, context,
subscription state) per chunk; they SHALL be recomputed only when an event that can
change them arrives. Renderer-driven presentation changes SHALL remain eligible for
invalidation independently of semantic block revisions.

#### Scenario: Shell stays live under a heavy command
- **WHEN** the agent executes a command that streams output faster than the frame
  interval for many seconds
- **THEN** typed input SHALL be accepted and echoed while the command runs
- **AND** timed indicators SHALL keep animating for the duration of the command

#### Scenario: Chunks outnumber frames
- **WHEN** many partial results for one tool call arrive within one coalescing interval
- **THEN** the shell SHALL apply only the newest of them, including its supported rendering metadata
- **AND** the intermediate partials SHALL NOT each pay the event pipeline's full cost

#### Scenario: The end of a tool execution is immediate
- **WHEN** a tool execution ends while a coalesced partial is still waiting
- **THEN** the final result SHALL be applied immediately and the waiting partial SHALL be
  discarded rather than applied afterwards
- **AND** flushing the adapter's events SHALL deliver any coalesced partial that has not
  yet been applied, so a caller that flushes observes the newest output

#### Scenario: A partial result is not summarized
- **WHEN** a partial tool result restates the accumulated output
- **THEN** the shell SHALL render its text from the block's text while retaining supported structured details and attachment references required by the renderer
- **AND** a serialized diagnostic summary of the result SHALL be produced only when the execution ends
- **AND** that summary SHALL NOT replace the complete supported rendering payload

### Requirement: Clipboard images reach prompts as canonical base64
The owned shell SHALL accept clipboard images encoded as valid standard padded or unpadded base64 subject to finite source-intake safeguards, and SHALL canonicalize each prepared attachment to RFC 4648 standard base64 with required trailing padding before marking its image chip ready or submitting it to the agent session. A pending paste/image chip SHALL be permitted before acquisition and preparation finish, but SHALL NOT be treated as a ready attachment. Canonicalization alone SHALL preserve exact decoded bytes and declared MIME type. Images already within preparation and applicable downstream limits SHALL remain byte-identical; eligible oversized images SHALL instead pass through the declared background resizing policy before final canonicalization, preserving the resulting bytes and actual output MIME type. The shell SHALL NOT submit malformed image data or a data-URL wrapper as an image payload.

#### Scenario: Paste an image requiring two padding characters
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring two trailing `=` characters that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the two required padding characters

#### Scenario: Paste an image requiring one padding character
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring one trailing `=` character that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the required padding character

#### Scenario: Paste an already canonical image
- **WHEN** the clipboard supplies a valid padded standard-base64 image that needs no resizing under the preparation policy
- **THEN** the shell SHALL preserve its decoded bytes and MIME type
- **AND** prompt submission SHALL contain one canonical attachment for the image chip

#### Scenario: Clipboard image data is malformed
- **WHEN** a clipboard adapter supplies empty data, an invalid alphabet, invalid padding, an impossible base64 length, or a data-URL wrapper as image data
- **THEN** the shell SHALL NOT store or submit that value as an image attachment
- **AND** it SHALL resolve the temporary paste marker to available clipboard text through the existing text path or otherwise remove it without changing surrounding prompt text

#### Scenario: Submit a normalized clipboard image to a strict provider
- **WHEN** a pasted clipboard image is represented by a ready image chip and the prompt is submitted
- **THEN** the agent session SHALL receive canonical base64 for the final prepared image suitable for construction of a strict provider data URL
- **AND** the user-visible chip label SHALL remain in the submitted prompt text as before

#### Scenario: Oversized source is canonicalized after resizing
- **WHEN** a valid padded or unpadded source exceeds the preparation target but can be safely resized within output limits
- **THEN** the shell SHALL prepare it in the background and store canonical base64 for the resulting image, not enforce source-byte equality with the original
- **AND** the resulting MIME type and bytes SHALL remain consistent through chip readiness and dispatch

### Requirement: Keyboard input reaches an immediate current-state presentation
The owned shell SHALL accept and apply terminal keyboard input in receipt order without dropping, duplicating, or reinterpreting text, editing commands, navigation, shortcuts, paste, submission, cancellation, or interruption. Keyboard-driven semantic state SHALL NOT wait for the streamed-presentation cadence. The first eligible input state SHALL request immediate presentation, and rapid input MAY omit superseded intermediate visual states only when every input has already been applied in order and the next presentation contains the newest eligible state.

The shell SHALL keep at most one keyboard-driven presentation pending, SHALL NOT let a pending stream frame or a sequence of stale input frames delay newer input, and SHALL reach zero accepted-but-unpresented input backlog when the input burst and immediate presentation opportunity complete. These guarantees SHALL apply to the default editor, selectors, menus, dialogs, and declared replacement input surfaces; an extension or terminal sequence that is not known to be safe for burst coordination SHALL retain conservative ordered delivery.

#### Scenario: Type an isolated character
- **WHEN** the ordinary editor receives one text or editing key while the session is idle
- **THEN** the key SHALL be applied in receipt order and the resulting state SHALL become eligible for immediate presentation without waiting for a frame-cadence timer
- **AND** no unrelated transcript work or older pending input frame SHALL delay it

#### Scenario: Type a rapid text burst
- **WHEN** multiple text inputs arrive before the first keyboard-driven presentation runs
- **THEN** every input SHALL be applied exactly once in receipt order
- **AND** the first presentation after the burst SHALL contain the newest applied editor state
- **AND** superseded intermediate states MAY remain unpainted rather than each forcing a separate frame
- **AND** accepted-but-unpresented input backlog SHALL return to zero after that presentation

#### Scenario: Edit text rapidly
- **WHEN** cursor movement, deletion, insertion, and grapheme-containing text arrive in a rapid ordered sequence
- **THEN** the final text, cursor boundary, selection, autocomplete state, and history state SHALL match sequential Pi input semantics
- **AND** no byte sequence, Unicode grapheme, or editing action SHALL be lost, split, duplicated, or reordered by presentation coordination

#### Scenario: Navigate an active menu
- **WHEN** a selector, menu, dialog, or replacement input surface receives repeated navigation keys before presentation catches up
- **THEN** every navigation action SHALL update the focused surface in order
- **AND** the next eligible presentation SHALL show its newest selection and instructions without painting each superseded selected row
- **AND** activation or cancellation SHALL apply to the selection established by all preceding input

#### Scenario: Submit after a burst
- **WHEN** text or navigation input is followed by submit, activation, cancellation, or interruption while input presentation is pending
- **THEN** all preceding input SHALL be applied before that control action
- **AND** the action SHALL run exactly once against the resulting current state
- **AND** no delayed intermediate presentation SHALL overwrite the post-action surface

#### Scenario: Type while streaming presentation is pending
- **WHEN** keyboard input arrives while streamed transcript output has a coalesced frame pending
- **THEN** keyboard processing and its current-state presentation SHALL preempt that stream deadline
- **AND** the later stream presentation SHALL include the already-applied keyboard state rather than restoring an older frame

#### Scenario: Receive an input sequence outside the safe coordination grammar
- **WHEN** terminal protocol input, an extension-owned handler, a custom surface, or an unrecognized escape sequence cannot be proven safe to coordinate as a burst
- **THEN** the shell SHALL flush preceding accepted input and deliver that sequence conservatively in order
- **AND** it SHALL NOT guess, split, combine, discard, or postpone the sequence behind a cadence timer

### Requirement: Comparative input responsiveness has independent evidence
Keyboard responsiveness acceptance SHALL use isolated bare-`a1`, `a1 pi`, and untouched pinned-Pi producers with equivalent terminal geometry, prepared state, input sequence, scheduler controls, and warmed execution. Evidence SHALL identify input receipt, semantic application, presentation request, composition, terminal write, highest presented input revision, pending-frame depth, and accepted-but-unpresented backlog for ordinary typing, rapid editing, submit, menu navigation, replacement surfaces, long transcripts, and concurrent streaming.

Deterministic ordering, scheduling, backlog, frame-count, stable-work, and terminal-paint budgets SHALL be automated gates. Same-run monotonic first-state and final-state input-to-paint distributions SHALL be recorded for diagnosis and comparison but SHALL NOT be the sole automated verdict. Exact-artifact comparison in Windows Terminal against `a1 pi` SHALL remain authoritative for perceived responsiveness.

Stable-work evidence SHALL associate each measured composition's transcript render delta and terminal paint with that composition's own cause and viewport regions. A checkpoint containing multiple frames SHALL NOT attribute all of its work to its final frame. Frames classified as geometry-stable dock input SHALL retain a budget of zero transcript block renders and zero transcript painted rows. Measured non-input work SHALL remain explicitly represented; no frame, counter increment, or write range SHALL be dropped, counted twice, or relabeled to satisfy a budget. Evidence collection SHALL be observational and SHALL NOT render, flush, repair, or reschedule the candidate to obtain a passing result.

#### Scenario: Run the comparative input matrix
- **WHEN** keyboard-responsiveness evidence is captured
- **THEN** each producer SHALL run independently with the same declared workload inputs and environment
- **AND** the result SHALL report bounded machine-readable phase, backlog, frame, paint, and monotonic timing evidence
- **AND** a producer failure, timeout, malformed result, or missing checkpoint SHALL fail the evidence gate

#### Scenario: Evaluate a rapid-input workload
- **WHEN** the bare-A1 producer completes a declared typing, editing, or menu-navigation burst
- **THEN** its semantic result SHALL match the comparison producers
- **AND** its pending keyboard presentation depth, stale-input backlog, superseded frame count, and stable transcript work SHALL stay within the repository-owned deterministic budgets
- **AND** diagnostic first-state and final-state timings SHALL be compared with the same-run `a1 pi` and pinned-Pi distributions

#### Scenario: Evaluate a long transcript
- **WHEN** equivalent input is applied with both an empty transcript and a prepared long transcript
- **THEN** bare A1's keyboard routing, pending-frame depth, dock/input work, and input-to-paint presentation opportunities SHALL remain equivalent
- **AND** settled transcript size SHALL NOT add per-key transcript rendering work

#### Scenario: Accept physical responsiveness
- **WHEN** an exact candidate artifact is tested in Windows Terminal beside `a1 pi`
- **THEN** typing SHALL visibly start immediately, rapid bursts SHALL visibly finish without catching up after input stops, and held or repeated menu navigation SHALL track the current selection
- **AND** any user-observed delayed start, delayed finish, stale selection, or material responsiveness gap SHALL invalidate acceptance despite passing diagnostics

#### Scenario: A stream frame precedes stable input in one checkpoint
- **WHEN** a legitimate stream-content frame renders or paints transcript content and a later stable dock-input frame in the same checkpoint performs no transcript work
- **THEN** the stream work SHALL remain attributed to the stream frame
- **AND** the dock-input frame SHALL contribute zero stable transcript work regardless of its position in the checkpoint

#### Scenario: A stable-input violation precedes another frame
- **WHEN** a dock-input frame performs a transcript block render or paints a transcript row before a stream or geometry frame in the same checkpoint
- **THEN** the stable-work gate SHALL fail for the violating dock-input frame
- **AND** the later frame's cause SHALL NOT hide the earlier violation

#### Scenario: Frame evidence is incomplete or inconsistent
- **WHEN** measured render deltas or terminal-write ranges cannot be accounted for exactly once, frame ordering or cause is ambiguous, or required evidence is missing
- **THEN** the gate SHALL reject the evidence rather than assume zero work or fall back to the final checkpoint cause
- **AND** legitimate no-write compositions and separately identified non-frame terminal controls SHALL remain representable without fabricating a frame

#### Scenario: Diagnose the first stable-work failure
- **WHEN** a frame violates a stable-render or stable-paint budget
- **THEN** the failure SHALL identify the workload, producer, checkpoint, frame identity and cause, expected and actual counters, viewport region, and relevant terminal-write range from the original capture
- **AND** the diagnostic SHALL be bounded, SHALL NOT require a second producer run, and SHALL NOT dump arbitrary transcript or credential content

### Requirement: The owned shell preserves setting-controlled Pi behavior
Every Pi setting the A1-owned settings replacement presents SHALL control the same active-session, presentation, terminal, startup, or shutdown behavior that the pinned Pi setting controls. The replacement SHALL not count persistence, callback reachability, or selector rendering as preservation of a pinned capability. An inventory entry with no effect in the active product mode or environment SHALL be omitted from the settings UI rather than rendered as an unavailable option. A supported setting that provides a defined terminal fallback remains present and SHALL render that fallback truthfully.

#### Scenario: Change a pinned live setting through bare A1
- **WHEN** the user changes a setting that pinned Pi applies live
- **THEN** bare A1 SHALL update the equivalent active agent, component, or terminal behavior in the same session

#### Scenario: Re-render existing transcript content
- **WHEN** an image, thinking-visibility, Mermaid, width, or output-padding setting changes
- **THEN** existing affected transcript blocks SHALL be reconstructed or invalidated with stable semantic identity and SHALL show the new presentation

#### Scenario: Use a terminal without inline-image support
- **WHEN** the transcript contains an image but the terminal advertises no protocol supported by the pinned renderer
- **THEN** the attachment SHALL remain visible through a textual fallback and inline-image availability SHALL not be claimed

#### Scenario: Exit the owned fullscreen surface
- **WHEN** the shell disposes after `fullscreenExitOutput` has selected transcript or resume-hint output
- **THEN** the output SHALL appear only after alternate-screen restoration and SHALL match the selected mode

#### Scenario: Start before project trust is known
- **WHEN** no effective project-trust decision has been resolved
- **THEN** the owned runtime SHALL not construct a project-trusted resource pipeline or load project-scoped resources

#### Scenario: An inventory setting has no behavioral consumer
- **WHEN** conformance finds a setting that cannot change its declared observable behavior in the active product mode or environment
- **THEN** the owned settings UI SHALL omit the option
- **AND** the owned-shell acceptance gate SHALL fail if the option is rendered even when disabled or accompanied by explanatory text

### Requirement: Setting-controlled owned surfaces preserve pinned Pi visual semantics
For the same terminal dimensions, theme, capabilities, semantic content, setting values, and lifecycle state, every visible surface controlled by a Pi setting SHALL match pinned Pi's terminal-cell presentation. Parity SHALL include visible text and punctuation, semantic foreground and background styling, bold/dim/italic/underline roles, borders, padding, blank rows, row order, wrapping, truncation, alignment, editor and footer geometry, cursor placement, and terminal-control ordering. Declared product identity, A1-only setting content, hidden bare-A1 entries, the owned settings interaction contract including its distinct floating scalar menus, profile/session values, dynamic usage data, absolute link targets, and nondeterministic render timing MAY differ; no other visual difference is implicit.

#### Scenario: Render a setting-controlled frame
- **WHEN** bare A1 and pinned Pi receive equivalent content and lifecycle events with the same visible setting value and terminal dimensions
- **THEN** their normalized terminal cells, semantic ANSI roles, geometry, and control ordering SHALL match except for declared substitutions

#### Scenario: Render the owned settings surface
- **WHEN** A1 presents its A1 and Agent settings sections
- **THEN** rows, values, selected state, numeric controls, menus, dialogs, notices, padding, wrapping, clipping, and narrow-terminal behavior SHALL retain the reviewed shared-component semantics
- **AND** selected-entry descriptions SHALL remain model metadata without rendering description rows
- **AND** search SHALL remain closed until `/` is invoked, then render through the shared ruled line-input composition with its search placeholder
- **AND** ordinary printable input outside an open search SHALL not become a query
- **AND** the standing status bar SHALL derive its visible guidance from the active settings shortcut declarations
- **AND** settings-list wheel movement SHALL use the current effective `scrollbarSpeed` through the shared scrollbar distance policy, including a pending live selection, without an independent row-count literal
- **AND** a scalar menu SHALL retain shared `ValueMenu` geometry and input behavior while rendering unselected choices on A1's dark floating-panel background, the active choice on its lighter background with white text, and `✓` beside the effective value independently of the active choice
- **AND** A1-specific grouping, hidden entries, and this owned settings interaction SHALL remain declared product differences

#### Scenario: Present project trust before loading project resources
- **WHEN** an undecided interactive launch requires a trust decision
- **THEN** the bounded preflight SHALL present a pinned-style startup selector with equivalent focus, accept, reject, cancel, clear, and terminal-restoration behavior
- **AND** no project-derived presentation or executable resource SHALL load before the decision

#### Scenario: Compare automated visual evidence
- **WHEN** automated parity evidence is evaluated
- **THEN** it SHALL compare independent pinned and A1 producers without stripping semantic SGR styling or replacing geometry with text-only snapshots

#### Scenario: Claim final visual acceptance
- **WHEN** deterministic parity checks pass
- **THEN** user-controlled physical-terminal comparison SHALL still verify the claimed terminal's rasterized result, selection, resize, cursor, restoration, and supported image behavior

### Requirement: Bare A1 progress indicators use the shared component presentation
Bare A1 SHALL present every built-in working, retrying, and compacting state and every extension-provided working state through the shared spinner-backed progress-text rule. The visible labels SHALL therefore use exactly three ASCII periods (`...`) while preserving each state's semantic wording, spinner frames and cadence, color, placement, replacement behavior, and lifecycle. This SHALL be a declared bare-A1 presentation difference and SHALL NOT alter the regular `a1 pi` route, vanilla Pi, installed Pi packages, or source-synchronized Pi components.

#### Scenario: Move between built-in progress states
- **WHEN** a run moves among working, retrying, and compacting states
- **THEN** bare A1 SHALL show `Working...`, `Retrying...`, or `Compacting...` beside the active spinner
- **AND** no state transition SHALL display a Unicode ellipsis or require state-specific punctuation logic

#### Scenario: Present an extension working message
- **WHEN** an extension supplies `Indexing sources` as the active working message
- **THEN** the shared spinner-backed status surface SHALL display `Indexing sources...`
- **AND** clearing or replacing the extension message SHALL retain the existing lifecycle and restoration behavior

#### Scenario: Preserve status presentation other than punctuation
- **WHEN** the component canonicalizes a built-in or extension progress message
- **THEN** the spinner animation, theme roles, row geometry, prompt-relative position, replacement timing, and terminal cleanup SHALL remain unchanged

#### Scenario: Use a comparison or upstream route
- **WHEN** the same session is run through `a1 pi` or vanilla Pi
- **THEN** that route's status text and component implementation SHALL remain untouched

### Requirement: Persistent prompt history is a declared bare-A1 editor replacement
Bare A1 SHALL declare enabled persistent prompt history as a replacement for the default editor's current-session history source, duplicate policy, recalled-entry caret placement, and browsing border presentation, implemented through an explicitly owned, source-traced editor adaptation. That replacement SHALL follow the `persistent-prompt-history` capability and SHALL NOT change other editor, submission, transcript, viewport, public extension, or session behavior. The `a1 pi` comparison SHALL keep its existing pinned-based editor path and current-session history semantics and SHALL NOT initialize A1's durable-history storage or adapted editor. When persistence is disabled, bare A1 SHALL retain its existing editor path and current-session recall without the persistent-history replacement.

#### Scenario: Browse saved history in bare A1
- **WHEN** the user starts bare A1 with persistence enabled and recalls a prior-session prompt
- **THEN** the declared replacement SHALL provide v2-style global unique recall, directional caret placement, and the history border indicator
- **AND** it SHALL keep draft restoration and existing local input recovery reachable

#### Scenario: Compare against pinned Pi
- **WHEN** `a1 pi` is launched with A1 history files present
- **THEN** its history ordering, adjacent-duplicate handling, navigation placement, and ordinary border SHALL match pinned Pi
- **AND** A1 history files, workers, polling, settings effects, and cross-session recall SHALL remain unused

#### Scenario: Evaluate the replacement boundary
- **WHEN** independent parity and v2 behavior evidence are evaluated
- **THEN** only the history differences named by this declaration SHALL be classified as expected bare-A1 customization
- **AND** multiline cursor movement, autocomplete, selection, undo, prompt execution, suggestions, viewport behavior, and unrelated surfaces SHALL retain their existing contracts

#### Scenario: Disable persistence
- **WHEN** bare A1 starts with history persistence disabled
- **THEN** current-session prompt recall and recovery SHALL remain available without loading prior-session durable entries
- **AND** no persistent-history indicator or directional-caret replacement SHALL be applied

### Requirement: The owned history editor has a bounded typed and source-traced boundary
The history-enabled default editor adaptation SHALL be traceable to the selected pinned editor source and only the necessary editor-local helper closure, with license attribution and reviewed modifications. Its history synchronization and navigation SHALL use owned typed operations that preserve draft, cursor, paste backing, and undo semantics, rather than access Pi's private state, patch installed dependencies or prototypes, extract dependency source at runtime, or emulate navigation through ordinary text replacement and synthetic keys. The adaptation SHALL remain within the Pi component boundary and SHALL NOT introduce a second terminal runtime or replace the terminal package's shared exports.

#### Scenario: Establish the adapted editor baseline
- **WHEN** the source-derived core is evaluated before history customization is enabled
- **THEN** independent equivalent inputs SHALL produce the same baseline text, cursor, draft restoration, undo grouping, paste expansion, autocomplete, rendering, and submit behavior as the untouched pinned editor
- **AND** history customization SHALL NOT be enabled until that baseline and the typed integration boundary are verified

#### Scenario: Upstream editor provenance changes
- **WHEN** the selected dependency or source authority no longer matches the recorded editor/helper provenance
- **THEN** compatibility validation SHALL name the unreviewed change and block acceptance until it is explicitly reconciled
- **AND** an engine upgrade SHALL NOT silently regenerate or overwrite the owned editor's runtime behavior

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

### Requirement: Contextual prompt suggestions are a declared bare-A1 addition
Contextual prompt suggestions SHALL be classified as an A1-owned addition to the ordinary editor in bare A1, with their A1-backed control presented in the existing Agent section of the owned settings replacement. The addition SHALL preserve the existing transcript, dock, editor, autocomplete, extension, input-responsiveness, lifecycle, and terminal-restoration contracts except for the explicitly declared empty-editor ghost text, its acceptance behavior, and this named settings-placement exception. The control's section SHALL NOT determine its storage backend or grant it engine-setting authority. The explicit `a1 pi` comparison route and untouched pinned Pi SHALL remain unchanged and SHALL not perform suggestion requests on A1's behalf.

#### Scenario: Use contextual suggestions in bare A1
- **WHEN** bare A1 is running and contextual suggestion requirements make a suggestion visible
- **THEN** the owned editor SHALL present and accept the declared ghost-text addition
- **AND** all unaffected shell surfaces and interactions SHALL retain their existing behavior

#### Scenario: Group the suggestion control without transferring ownership
- **WHEN** bare A1 presents its owned settings replacement
- **THEN** Prompt suggestions SHALL appear only in the single Agent section while retaining its A1-owned persistence and live behavior
- **AND** this declared placement exception SHALL NOT add it to Pi-generated settings metadata, change other controls' ownership or grouping, or expose it in the pinned comparison settings

#### Scenario: Run the comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** A1's contextual suggestion generation, state, rendering, and key interception SHALL be absent
- **AND** the selected upstream Pi experience SHALL remain untouched

#### Scenario: Type while suggestion generation is pending
- **WHEN** keyboard input arrives while an asynchronous suggestion request is pending before or after run settlement
- **THEN** the input SHALL retain the immediate current-state presentation guarantees
- **AND** suggestion generation SHALL not add a pending presentation or synchronous event batch ahead of that input

#### Scenario: Settle while a suggestion is prepared
- **WHEN** background generation has prepared a valid suggestion before the agent run settles
- **THEN** settlement SHALL clear the ordinary working state as before and make the complete suggestion eligible in the same presentation cycle
- **AND** no retained working indicator, generation-status row, or staged text animation SHALL extend the run's visible busy state

#### Scenario: Use an extension-provided editor or autocomplete provider
- **WHEN** an extension replaces the editor or provides an active autocomplete result
- **THEN** the extension surface SHALL retain its existing rendering and input ownership
- **AND** the contextual suggestion addition SHALL neither paint into nor intercept input from that surface

### Requirement: Tool argument completion does not finalize execution
The owned shell SHALL distinguish completion of an assistant message's tool arguments from completion of the corresponding tool execution. A completed call declaration SHALL remain eligible for execution-start and accumulated-result updates until that execution succeeds, fails, or is aborted. One tool invocation SHALL retain one stable surface through those transitions. Repeated declarations and message/turn reconciliation SHALL NOT downgrade a completed execution to an argument-only or running surface.

The stale-update policy SHALL reject obsolete revisions and updates following actual execution completion, not valid later phases of the same invocation. These guarantees SHALL hold across coalesced delivery, multiple tools, and full-view reconciliation.

#### Scenario: Execute after arguments finish
- **WHEN** an assistant finishes a tool-call message and that invocation subsequently starts and produces live output
- **THEN** the same tool surface SHALL show the running execution and newest accumulated output at the next eligible presentation
- **AND** argument completion SHALL NOT cause that output to be classified as stale

#### Scenario: Complete with a partial presentation pending
- **WHEN** an execution completes while an older partial update is queued or awaiting presentation
- **THEN** its final result SHALL become immediately eligible for presentation
- **AND** the old partial SHALL NOT overwrite, reopen, or remove the completed result

#### Scenario: Restate a completed call
- **WHEN** message or turn reconciliation repeats a tool declaration after that invocation has produced its final result
- **THEN** the result, execution disposition, arguments, and stable surface identity SHALL remain available without an intermediate argument-only replacement

#### Scenario: Interleave multiple executions
- **WHEN** several tool invocations have interleaved declarations, execution updates, errors, and completions
- **THEN** each surface SHALL retain the correct invocation's arguments, output, and disposition
- **AND** completion of one invocation SHALL NOT suppress another invocation's live output

#### Scenario: Abort a declared invocation
- **WHEN** the pinned lifecycle aborts or rejects a declared tool invocation before or during execution
- **THEN** its visible terminal disposition SHALL follow the pinned error/abort behavior
- **AND** later obsolete execution updates SHALL NOT revive it

### Requirement: Run completion preserves the active transcript continuously
Every displayable semantic user, assistant, thinking, and tool surface in the active transcript SHALL remain available in its established order through message completion, run completion, settlement, and presentation coalescing. A completion event carrying only the messages generated in that run SHALL NOT be interpreted as a replacement for the complete session history, even temporarily. Reconciliation SHALL use the pinned session-authoritative scope appropriate to the operation and SHALL preserve unchanged surface identities. That reconciliation, together with block identity, revision numbering, tool lifecycle settlement, and image asset retention, SHALL be one transcript projection owned by the engine adapter and testable without the adapter: it SHALL receive the session-authoritative messages and the retry attempt it needs as inputs and SHALL report each stored block change through a port, while the adapter alone decides when pending delivery snapshots are sealed and when a change is delivered.

This requirement SHALL preserve existing visibility, expansion, branch, compaction, navigation, and explicit session-replacement policies. It SHALL NOT require retaining every superseded partial snapshot or rendering off-screen or deliberately hidden content. Actual authoritative removal or session replacement SHALL remain distinguishable from ordinary run completion.

#### Scenario: Finish a later run in an existing conversation
- **WHEN** earlier user and assistant messages exist and a later run ends with a run-local message collection
- **THEN** every presented intermediate and settled transcript state SHALL retain the earlier messages and all displayable messages of the later run
- **AND** no later settlement event SHALL be needed to restore missing earlier surfaces

#### Scenario: Delay settlement after run completion
- **WHEN** settlement follows run completion after an asynchronous operation or additional event-loop turns
- **THEN** the transcript SHALL remain complete throughout that interval
- **AND** the reader SHALL be able to scroll to and copy earlier retained content

#### Scenario: Complete mixed assistant content
- **WHEN** an assistant emits consecutive or interleaved text, thinking, code, and tool-call content and completes
- **THEN** all displayable parts SHALL retain their source order and pinned content boundaries
- **AND** starting a subsequent message SHALL NOT remove completed commentary or thinking surfaces

#### Scenario: Replace the authoritative session scope
- **WHEN** explicit session or branch replacement, or the existing compaction policy, supplies a legitimately different authoritative transcript
- **THEN** the shell SHALL reconcile that scope according to its existing contract
- **AND** obsolete generation events SHALL NOT repopulate removed content or mutate the replacement session

#### Scenario: Project a transcript without an engine
- **WHEN** the projection is driven directly with session messages, tool execution events, and declaration failures
- **THEN** it SHALL produce the same block identities, revisions, and settlement outcomes the shell observes through the adapter
- **AND** a block that repeats itself SHALL neither change revision nor be reported

### Requirement: Tool presentation receives complete supported rendering data
The owned component boundary SHALL preserve the supported result content, structured renderer details, invocation arguments, error/partial state, and attachment references required by the pinned built-in and registered extension renderers. A text-only reconstruction or a truncated diagnostic summary SHALL NOT substitute for rendering data. Supported partial-result metadata SHALL remain available without serializing a complete accumulated result for each chunk.

Existing validated payload and asset limits SHALL remain enforced. When a supported representation is unavailable or a renderer fails, the shell SHALL preserve the existing visible fallback or error behavior rather than silently omit the affected result. Attachment ownership SHALL remain consistent when references arrive after the initial call surface is created.

#### Scenario: Render a successful edit without a usable preview
- **WHEN** a completed edit supplies an authoritative diff but its earlier preview is absent, stale, or failed
- **THEN** the completed surface SHALL show the authoritative result diff in pinned styling
- **AND** it SHALL NOT depend on rereading the already-edited file to recover discarded result metadata

#### Scenario: Render structured extension output
- **WHEN** a registered tool renderer consumes supported structured details from a partial or final result
- **THEN** those details and the invocation state SHALL reach the renderer without being replaced by plain text or a diagnostic-summary wrapper
- **AND** coalescing SHALL preserve the newest complete rendering state for that invocation

#### Scenario: Add an attachment after the call header
- **WHEN** a tool's result introduces a supported image or attachment after its call surface already exists
- **THEN** the existing surface SHALL acquire the corresponding inline presentation or declared fallback according to settings and terminal capabilities
- **AND** the attachment SHALL NOT disappear because the initial surface had no attachment references

#### Scenario: Encounter unsupported or failing presentation
- **WHEN** rendering data exceeds an existing supported limit, an asset is unavailable, or a custom renderer fails
- **THEN** the shell SHALL apply the declared bounded fallback or failure behavior
- **AND** unaffected transcript content and operation outcome SHALL remain visible

### Requirement: Presentation invalidation is independent of semantic completion
A mounted renderer's supported invalidation request SHALL make its current presentation eligible for the real shell scheduler even when its semantic block revision and execution disposition have not changed. The next eligible frame SHALL refresh the affected rendering and any dependent document or viewport geometry rather than reuse stale cached rows.

Presentation invalidation SHALL preserve semantic identity and SHALL NOT manufacture agent events, completed-message counts, or persisted conversation entries. Unaffected block caches SHALL remain reusable. Obsolete renderer callbacks SHALL NOT invalidate a replacement component or session. Off-screen invalidation SHALL mark the affected presentation stale without requiring eager rendering of the complete historical transcript.

#### Scenario: Finish an asynchronous preview after a frame
- **WHEN** a renderer completes asynchronous preview work and requests invalidation after its finalized block was rendered
- **THEN** the updated preview SHALL appear at the next eligible frame without requiring another agent event, user input, resize, or reopen
- **AND** cached document rows SHALL not hide the renderer's new output

#### Scenario: Change row count asynchronously
- **WHEN** a renderer invalidation changes the height of an existing surface
- **THEN** dependent document extent, viewport allocation, follow/detach state, selection mapping, and hit regions SHALL be recomputed consistently
- **AND** unaffected semantic content and dock ownership SHALL remain intact

#### Scenario: Invalidate during a pending dock or stream frame
- **WHEN** a renderer changes after a frame is requested but before that frame is composed
- **THEN** presentation SHALL use its newest eligible state
- **AND** an earlier dock-reuse decision or stream timer SHALL NOT restore the old rows

#### Scenario: Complete work for an obsolete renderer
- **WHEN** asynchronous work completes after the owning component was replaced or disposed or its session generation changed
- **THEN** its callback SHALL NOT repaint or invalidate the replacement surface
- **AND** no old semantic state SHALL be revived

#### Scenario: Invalidate an off-screen block
- **WHEN** an off-screen mounted renderer invalidates while the reader views other content
- **THEN** its next visible presentation SHALL be current
- **AND** the invalidation SHALL NOT force every historical block to render immediately

### Requirement: Agent content presentation follows pinned Pi outside declared product differences
For equivalent supported inputs and visibility settings, the owned shell SHALL preserve pinned Pi's displayable content boundaries, tool-result presentation, text styling and spacing, and execution/renderer lifecycle behavior outside existing documented A1 product differences. It SHALL NOT replace supported structured tool presentation with a text approximation or introduce avoidable content disappearance or flashing through its adaptations.

This requirement SHALL preserve existing bounded delivery, payload validation, asset ownership, error isolation, and viewport/editor/modal/selection behavior. It SHALL NOT require removing documented A1 features, showing superseded partial snapshots, or modifying the pinned comparison route. Existing link-specific defects tracked separately in issue #353 SHALL NOT be represented as intentional content differences or as repaired by this parity claim.

#### Scenario: Present ordinary text and tool output
- **WHEN** equivalent assistant text, thinking, fenced code, and text-only tool output are presented in A1 and the independent pinned reference
- **THEN** content boundaries and styled presentation SHALL match outside documented A1 differences
- **AND** A1 SHALL NOT omit a required surface or add artificial blank or argument-only replacement states

#### Scenario: Present structured tool results through a simplified adapter
- **WHEN** a content-rendering adaptation is simplified and equivalent supported edit or extension results are compared with pinned Pi
- **THEN** the actual result presentation and lifecycle behavior SHALL remain faithful to pinned Pi
- **AND** payload limits, attachment ownership, visible fallbacks, and unrelated transcript content SHALL remain protected

### Requirement: Content-retention evidence uses production lifecycle and presentation boundaries
Rendering acceptance SHALL exercise the pinned production event ordering, including assistant argument completion before tool execution, multiple messages and invocations, run-local completion collections, delayed settlement, and asynchronous renderer callbacks. It SHALL verify complete semantic state, component output, cached document output, and emitted terminal results at intermediate as well as final checkpoints.

Evidence SHALL include ordinary scheduled presentation and coalesced bursts rather than force a render after every event in every workload. Tool-rendering parity SHALL use independent pinned renderers or the untouched pinned process with equivalent input, not an A1-authored text approximation, and SHALL identify existing documented A1 differences. Assertions SHALL detect omitted content, stale presentation, loss of structured results, resurrection of completed output, and artificial blank or stale intermediate frames separately from terminal damage and native hover behavior. Matching final text or reducing paint counts alone SHALL NOT establish content stability.

#### Scenario: Exercise the argument-to-execution boundary
- **WHEN** a production-ordered tool workload completes arguments, emits accumulated output, and settles with an older conversation present
- **THEN** evidence SHALL fail if any required live result is rejected, a completed result is downgraded, or prior transcript content disappears at any checked presentation boundary

#### Scenario: Exercise actual scheduling
- **WHEN** a burst combines content updates, completion, asynchronous invalidation, and keyboard or pointer input without per-event forced painting
- **THEN** the next eligible presentations SHALL contain all required current content and retain responsive input
- **AND** no superseded frame SHALL restore stale rows after those presentations

#### Scenario: Compare real tool rendering
- **WHEN** structured edit or extension results are compared with pinned Pi
- **THEN** equivalent complete payloads SHALL drive the independent actual tool renderers
- **AND** text-only substitute renderers or expectations derived solely from A1 SHALL NOT establish parity

#### Scenario: Detect transient presentation faults
- **WHEN** a test-only negative control drops a required surface, exposes an artificial blank frame, or restores stale rows before later recovering the correct final text
- **THEN** the corresponding intermediate or scheduled-presentation gate SHALL fail
- **AND** the eventual correct final snapshot SHALL NOT hide the fault

#### Scenario: Physical content instability contradicts automated evidence
- **WHEN** the exact candidate still loses a displayable block, requires resize/reopen to reveal current output, or exhibits unexplained A1-induced block flashing during user-controlled review
- **THEN** content-rendering acceptance SHALL remain incomplete
- **AND** evidence SHALL identify the earliest boundary where required content, presentation, or stability diverged from the pinned reference outside documented A1 differences

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

#### Scenario: Verify the missing-GitHub-CLI diagnostic exception
- **WHEN** independent pinned and A1 producers exercise `/share` with the GitHub CLI executable absent
- **THEN** evidence SHALL retain Pi 0.84.2's exact not-logged-in diagnostic and A1's exact installation diagnostic and identify this single intentional wording difference
- **AND** each output SHALL still satisfy its error severity and presentation contract, without blanket removal of text, whitespace, or styling from comparison
- **AND** a changed A1 installation message or application of the exception to an installed-but-unauthenticated executable or another outcome SHALL fail verification
- **AND** all other `/share` outcomes SHALL retain their existing pinned-parity requirements

#### Scenario: Missing or contradictory evidence
- **WHEN** a producer fails, a covered outcome lacks evidence, physical review contradicts an automated parity claim, fatal-command evidence conflates matching output with process lifecycle parity, or the missing-GitHub-CLI exception is applied to another outcome
- **THEN** the affected command outcome SHALL remain unaccepted rather than being marked complete based on a success-only fixture or an undisclosed lifecycle difference

### Requirement: Link inspection separates movement risk from hover cleanup
Row inspection used by owned damage-aware presentation SHALL report explicitly declared terminal hyperlinks separately from text that only resembles a link. Explicit hyperlinks and content that cannot be replayed safely SHALL restrict movement, because the terminal holds per-cell link identity that bounded region movement can misattribute. Text that only resembles a link SHALL restrict nothing beyond the host-hover decoration repair it was introduced for.

Owned presentation SHALL NOT request a whole-screen cleanup because streamed content changed a row that contains link-resembling text. Cleanup SHALL remain driven by pointer-hover transitions, deliberate link removal, and discarded link state, and a cleanup frame SHALL repaint the affected rows without an undeclared erase-display.

The inspector SHALL remain a conservative cleanup detector. It SHALL NOT become a link-activation parser, SHALL NOT infer transcript semantics, and SHALL NOT change the bytes any row emits.

#### Scenario: Inspect a row of ordinary code
- **WHEN** a transcript row contains dotted identifiers, file names, or relative paths but no declared terminal hyperlink
- **THEN** the row SHALL be reported as carrying no explicit hyperlink
- **AND** it SHALL NOT restrict a proven safe transcript transition

#### Scenario: Inspect a row with a declared hyperlink
- **WHEN** a transcript row carries an explicit terminal hyperlink sequence
- **THEN** the row SHALL be reported as explicitly linked
- **AND** existing conservative movement and cleanup treatment SHALL apply unchanged

#### Scenario: Stream over link-resembling text
- **WHEN** a streamed update changes a followed row whose text resembles a link
- **THEN** no whole-screen cleanup SHALL be requested by that content change
- **AND** the frame SHALL remain eligible for bounded movement

### Requirement: The real-damage allowance follows the declared live tail
The owned semantic frame SHALL declare how many visible rows belong to the currently streaming transcript block. The damage-aware adapter SHALL derive its allowed painted-row count from the declared transcript movement, that live-tail extent, the existing stable-boundary allowance, and the dock rows it already counts, rather than from a fixed slack that assumes a one-row live tail.

Painting more rows than that allowance SHALL continue to fail closed to the pinned renderer's own write. A frame whose live-tail extent is unavailable SHALL fall back to the existing fixed allowance rather than assume a larger one. Rows the frame attributes to settled content SHALL remain subject to the existing stable-row limit, so a stable-row regression still fails.

#### Scenario: Repaint a tall live block
- **WHEN** the declared live tail occupies several visible rows and every one of them changes in one streamed update
- **THEN** the adapter SHALL transform the frame into bounded movement plus those rows
- **AND** it SHALL NOT report excessive damage for the block's own legitimate rows

#### Scenario: Repaint settled rows
- **WHEN** a frame would paint settled transcript rows beyond the movement, the live tail, and the stable-boundary allowance
- **THEN** the adapter SHALL report excessive damage
- **AND** it SHALL forward the original pinned write unchanged

#### Scenario: Compose a frame without a declared live tail
- **WHEN** the semantic frame does not declare a live-tail extent
- **THEN** the adapter SHALL apply the existing fixed allowance
- **AND** it SHALL NOT widen its transformation on unknown metadata

### Requirement: Rendering evidence covers code and link-bearing streaming
Deterministic rendering evidence SHALL include streamed fenced code, streamed prose containing file paths and dotted identifiers, and a live tail taller than the stable-row slack, each driven through the existing independent producer and cell-replay support at a declared geometry.

Their budgets SHALL fail on a full-screen clear between the first streamed chunk and the settled message, on rejection of a movement the semantic frame proved safe when the only disqualifying input was link-resembling text, on repaint of stable settled rows, and on a stale final frame. Evidence SHALL record the bounded decision cause for every checkpoint so a fallback is attributable.

#### Scenario: Run the code-block workload
- **WHEN** the rendering evidence runs the streamed fenced-code workload for bare A1
- **THEN** it SHALL report the decision cause and painted-row count at every checkpoint
- **AND** the budget SHALL fail if any mid-stream frame clears the complete screen

#### Scenario: Run a comparison producer over the same workload
- **WHEN** `a1 pi` or untouched pinned Pi renders the same workload
- **THEN** the owned damage adapter SHALL not be active
- **AND** the comparison producer's terminal writes SHALL remain unchanged

### Requirement: Large ordinary text pastes use Pi-style compact chips
Bare A1's default prompt editor SHALL collapse an ordinary text paste into one compact chip when its normalized text contains more than 10 logical lines or more than 1,000 UTF-16 code units. Counts and retained text SHALL follow the pinned Pi paste normalization, including line-ending normalization, tab expansion, and control-character handling. More than 10 lines SHALL use `[paste #N +L lines]`; otherwise a qualifying paste SHALL use `[paste #N C chars]`. `L` SHALL count newline-separated logical lines, including a trailing empty line, and `C` SHALL count UTF-16 code units. Nonqualifying ordinary text SHALL remain inline. This behavior SHALL apply with persistent prompt history enabled or disabled, without changing `a1 pi`.

#### Scenario: Paste the reported multiline example
- **WHEN** the user pastes ordinary text containing 136 normalized logical lines into a fresh bare-A1 editor
- **THEN** the editor SHALL display `[paste #1 +136 lines]` instead of expanding all 136 lines
- **AND** the full normalized text SHALL remain available behind the chip

#### Scenario: Apply exact threshold boundaries
- **WHEN** an ordinary paste has at most 10 lines and at most 1,000 UTF-16 code units after normalization
- **THEN** it SHALL remain inline
- **WHEN** a paste has 11 lines or has 1,001 UTF-16 code units
- **THEN** it SHALL become a chip, with the line-count label taking precedence when both thresholds are exceeded

#### Scenario: Preserve specialized paste behavior
- **WHEN** clipboard content is recognized as a URL, existing file/folder paths, or an image by A1's established paste classification
- **THEN** the existing specialized chip and attachment behavior SHALL remain in effect rather than wrapping it in a text-paste chip

### Requirement: Text paste entry points preserve insertion and atomic editing
Clipboard shortcuts, right-click paste, and terminal bracketed paste SHALL produce equivalent compact text chips for the same qualifying ordinary payload. Terminal delivery chunking SHALL NOT change the result. A paste SHALL replace the selected range or insert at its captured position; asynchronous completion SHALL preserve newer text and paste-action ordering. Live text-paste chips SHALL act as whole units for caret traversal, selection, and deletion, retain correct payload identity through undo/redo and draft history navigation, and render within the available width.

#### Scenario: Paste through each supported entry point
- **WHEN** the same qualifying text is pasted through an owned clipboard shortcut, right-click paste, or a complete or fragmented bracketed-paste sequence
- **THEN** each action SHALL insert one equivalent text-paste chip
- **AND** pasted newlines SHALL NOT submit the prompt and terminal framing bytes SHALL NOT appear as editor text

#### Scenario: Replace a selection and complete reads out of order
- **WHEN** a paste replaces selected text and later typing or another paste occurs before clipboard reads finish
- **THEN** each result SHALL resolve at its own reserved position without overwriting newer input
- **AND** resolving a paste removed by the user or invalidated by session replacement SHALL NOT resurrect it

#### Scenario: Edit and recover a chip
- **WHEN** the user moves across, selects, or deletes a text-paste chip, then uses undo/redo or browses history and restores the draft
- **THEN** the chip SHALL behave atomically and each restored chip SHALL still resolve to its own full payload
- **AND** a later paste SHALL NOT overwrite the backing of another recoverable chip

#### Scenario: Render a narrow prompt
- **WHEN** the prompt is narrower than the chip label
- **THEN** rendered rows SHALL fit the terminal width without corrupting the chip's semantic identity, surrounding text, or caret mapping

### Requirement: Compact text chips resolve to complete prompt content
Copy/cut, prompt preparation, queued-input recovery, and durable recall SHALL resolve live text-paste chips to their complete normalized text, never silently truncating it or sending only the visible marker. Ordinary, steering, follow-up, and compaction-queued submissions SHALL preserve each pasted payload and its position exactly once. Existing submission-level outer trimming and durable-history eligibility and size limits SHALL remain unchanged. Expansion SHALL NOT recursively interpret marker-looking text inside a pasted payload, and unregistered marker-looking text SHALL remain literal.

#### Scenario: Submit or copy multiple text chips
- **WHEN** a draft contains surrounding typed text and several text-paste chips, including repeated identical pastes
- **THEN** copying or preparing that draft SHALL preserve the surrounding text and every pasted occurrence in order
- **AND** text-paste chips SHALL NOT create image attachments

#### Scenario: Submit before clipboard acquisition finishes
- **WHEN** the user submits a draft with an unresolved text paste and continues typing a new draft
- **THEN** the existing pending-submission flow SHALL wait for that captured paste and dispatch the complete captured text once
- **AND** completion or cancellation SHALL NOT alter the new draft or silently dispatch an incomplete prompt

#### Scenario: Paste code containing marker-like strings
- **WHEN** a text-paste payload contains literal paste, image, URL, or path-chip-looking strings, including strings matching another live chip's label
- **THEN** those strings SHALL remain literal payload content during copying, submission, and history preparation
- **AND** they SHALL NOT expand again, disappear, or attach an unrelated image

#### Scenario: Recall after restart
- **WHEN** a submitted text-chip prompt is eligible for durable history and the user recalls it in a fresh process
- **THEN** recall SHALL restore its actual normalized text independently of the originating chip registry
- **AND** internal line breaks and Unicode SHALL remain intact

### Requirement: Submission validation failures remain recoverable
The owned UI SHALL treat user-correctable prompt preparation and attachment validation failures as rejected submissions with bounded, actionable in-application feedback, not as uncaught exceptions or unhandled promise rejections. Before dispatch acceptance, a rejected submission SHALL preserve its text and attachment references for correction or explicit retry without overwriting newer editor input. Rejection SHALL NOT send a partial prompt, silently discard attachments, change the active session, or automatically retry the request. The same protection SHALL apply to ordinary prompts, steering, follow-ups, and submissions queued during compaction.

#### Scenario: Image validation rejects an editor submission
- **WHEN** an editor-submitted attachment fails validation before dispatch
- **THEN** the UI SHALL identify the attachment problem without including its payload
- **AND** the session SHALL remain interactive and the rejected draft SHALL remain recoverable
- **AND** no part of that rejected submission SHALL be sent to the agent

#### Scenario: Correct and resubmit after rejection
- **WHEN** the user removes or corrects a rejected attachment and submits again
- **THEN** the corrected submission SHALL dispatch exactly once
- **AND** subsequent typing, selection, and agent turns SHALL remain usable

#### Scenario: Failure races with new editor input
- **WHEN** an asynchronous submission fails after the user has typed another draft
- **THEN** the newer draft SHALL remain intact
- **AND** the failed pre-dispatch submission SHALL remain separately recoverable rather than replacing the newer draft

#### Scenario: Deferred image submission fails
- **WHEN** a steering, follow-up, or compaction-queued submission fails attachment validation
- **THEN** it SHALL produce one recoverable rejection without terminating the UI or repeatedly retrying the invalid item
- **AND** other valid queued work SHALL not be silently discarded

#### Scenario: Submission execution unexpectedly rejects
- **WHEN** prompt preparation or the submission execution promise throws or rejects unexpectedly
- **THEN** the owned callback boundary SHALL handle the failure and report bounded feedback without an unhandled rejection
- **AND** A1 SHALL NOT automatically resend a request whose acceptance is uncertain

### Requirement: Attachment admission and submission share finite limits
The owned UI SHALL distinguish source-image intake limits from prepared-attachment limits. It SHALL retain the maximum of eight prompt attachments and 8 MiB (8,388,608 bytes) of canonical base64 text per final attachment; this encoded-data limit SHALL NOT be described as an 8 MiB decoded-image limit. Source images of up to 20 MiB of compressed image bytes SHALL be eligible for preparation subject to supported format and bounded decoded-pixel safeguards, even when their original base64 exceeds the final limit. A1 SHALL attempt automatic resizing/recompression before rejecting an otherwise eligible source for final output size. Known downstream byte/dimension limits SHALL also constrain prepared output; local validity SHALL NOT imply universal provider acceptance. Malformed clipboard image data SHALL preserve the existing text-fallback or unchanged-prompt behavior and SHALL never be submitted as image data.

#### Scenario: Paste a screenshot larger than the final encoded limit
- **WHEN** a valid supported screenshot exceeds 8 MiB as original canonical base64 but satisfies source safety limits and can be prepared within output limits
- **THEN** A1 SHALL prepare and admit a size-compliant image without requiring manual resizing
- **AND** the final bytes, actual MIME type, and canonical base64 SHALL pass submission validation without a crash

#### Scenario: Final canonical data reaches the contract boundary
- **WHEN** final canonical base64 is exactly 8,388,608 bytes long
- **THEN** it SHALL pass the local encoded-size assertion, independently of any stricter preparation/downstream policy
- **AND** a final payload above that bound SHALL fail validation without dispatch, even if introduced through restored, queued, or non-clipboard input
- **AND** this final assertion SHALL NOT be used to reject eligible original clipboard bytes before preparation

#### Scenario: Excessive source or decoded size
- **WHEN** an image exceeds the source-byte or decoded-pixel safety bound
- **THEN** A1 SHALL reject it with a bounded diagnostic identifying the applicable source limit, not the final encoded-data limit
- **AND** the editor SHALL remain usable without an unbounded allocation or preparation attempt

#### Scenario: Too many attachments including pending images
- **WHEN** accepting another image would exceed eight image slots in a draft, including pending and failed image chips
- **THEN** A1 SHALL identify the attachment-count limit and allow correction without exiting, silently sending a subset, or starting unbounded background work

### Requirement: Image preparation preserves useful quality within output limits
The owned UI SHALL preserve exact bytes and MIME type for supported images already within its preparation target and applicable downstream constraints. For larger eligible images, A1 SHALL automatically produce a canonical, size-compliant attachment using a conservative target below 4.5 MiB of base64 text, further reduced when a known downstream limit requires it. Resizing SHALL preserve aspect ratio and orientation, SHALL NOT upscale or crop, and SHALL prefer lossless PNG for screenshot text and transparency before lossy alternatives. When resizing is needed, its initial longest edge SHALL be at most 2000 pixels. Further compression or downscaling SHALL be bounded and SHALL NOT turn an image into an arbitrarily tiny unreadable success. The displayed attachment state SHALL indicate when preparation resized or recompressed the source, and its MIME type SHALL match the actual output format. Unsupported conversion, preparation failure, or inability to fit the quality/size policy SHALL remain a recoverable rejection rather than silently dropping the image.

#### Scenario: Small screenshot needs no conversion
- **WHEN** a supported screenshot is below the preparation target and meets applicable downstream constraints and source safety checks
- **THEN** its exact bytes and MIME type SHALL be preserved through submission
- **AND** it SHALL not undergo unnecessary decode/re-encode work

#### Scenario: Large screenshot contains text
- **WHEN** an eligible large screenshot requires preparation
- **THEN** A1 SHALL preserve its composition and aspect ratio, prefer a size-compliant lossless output, and use bounded high-quality alternatives only when needed
- **AND** the prepared screenshot SHALL retain readable representative text in the acceptance fixtures
- **AND** the output SHALL meet both encoded and known downstream decoded-byte/dimension limits

#### Scenario: Transparency or orientation affects conversion
- **WHEN** resizing an image with transparency or orientation metadata
- **THEN** its visible orientation SHALL be preserved and transparency SHALL be retained in lossless output
- **AND** a required opaque conversion SHALL use a defined background rather than making transparent screenshot content unreadable

#### Scenario: Conversion cannot safely produce an acceptable result
- **WHEN** processing fails or no candidate fits the bounded quality/size policy
- **THEN** the image SHALL remain visibly failed and removable or retryable with payload-free feedback
- **AND** A1 SHALL neither label it ready nor submit text alone in place of the intended image prompt

### Requirement: Pending image submissions and cancellations are race-safe
Image preparation SHALL use stable attachment and submission identities so completion cannot overwrite newer input, resurrect deleted chips, or attach to another session. A submission referencing pending images SHALL visibly wait for all its referenced images to become ready before validating and dispatching its captured draft exactly once. Waiting SHALL remain asynchronous and cancellable and SHALL apply to ordinary prompts, steering, follow-ups, and compaction-queued work. A failed image SHALL prevent partial dispatch and leave the captured draft recoverable. A1 SHALL NOT automatically retry preparation after failure or resend a request whose dispatch acceptance is uncertain.

#### Scenario: Enter before image preparation finishes
- **WHEN** the user submits a draft containing pending images and then types a new draft
- **THEN** the submitted snapshot SHALL remain visibly waiting while the new draft stays editable
- **AND** once all referenced images are ready it SHALL validate and dispatch exactly once, without incorporating the newer draft
- **AND** repeated submit events for the same waiting intent SHALL NOT duplicate dispatch

#### Scenario: Preparation fails while submission is waiting
- **WHEN** one image in a waiting submission fails preparation
- **THEN** no part of that submission SHALL dispatch, and its text and attachment references SHALL remain recoverable
- **AND** unrelated valid queued work SHALL not be silently discarded

#### Scenario: Delete an image or cancel a waiting submission
- **WHEN** the user deletes an unsubmitted pending chip or explicitly cancels its waiting submission
- **THEN** its late completion SHALL not recreate the chip or dispatch the canceled intent
- **AND** preparation with no remaining live reference SHALL be canceled and released

#### Scenario: Session changes or the UI exits during preparation
- **WHEN** the session is replaced/reset or the UI is disposed while image preparation is pending
- **THEN** old-session work SHALL be canceled or ignored and SHALL not mutate the new session
- **AND** background workers and clipboard subprocesses SHALL be released within bounded shutdown, preserving existing terminal restoration

### Requirement: Fatal owned-UI exits restore the parent terminal
When an owned bare-A1 UI terminates, A1 SHALL restore the terminal state it owns before returning control to the parent shell. Restoration SHALL cover mouse-reporting modes, bracketed paste and keyboard modes, raw input where applicable, synchronized output, cursor visibility, wrapping and scrolling state, and the alternate screen. Fatal handling SHALL be bounded and idempotent, preserve a nonzero exit outcome, and SHALL NOT resume normal agent execution after an uncaught process-level failure. When the UI cannot perform cleanup but its launch owner survives and the terminal remains writable, the owner SHALL perform fallback mode restoration only after the UI has stopped writing. Cleanup SHALL NOT alter unrelated sessions or apply A1-specific behavior to arbitrary transparent commands.

#### Scenario: Uncaught failure with a live terminal
- **WHEN** the owned UI encounters an uncaught exception or otherwise unhandled rejection while mouse reporting is enabled
- **THEN** it SHALL stop normal work, restore terminal modes, and exit unsuccessfully within a bounded interval
- **AND** moving the mouse afterward SHALL not inject mouse-report strings into the parent shell

#### Scenario: UI exits without running its cleanup
- **WHEN** the UI process terminates abruptly while its launch owner and terminal remain available
- **THEN** the surviving owner SHALL restore owned terminal modes after child termination before completing the launch
- **AND** it SHALL preserve the unsuccessful outcome

#### Scenario: Cleanup itself fails or stalls
- **WHEN** application disposal throws, stalls, or terminal output is unavailable
- **THEN** remaining best-effort cleanup SHALL not wait indefinitely or recursively enter fatal handling
- **AND** the original failure SHALL remain distinguishable from cleanup failure

#### Scenario: Normal exit remains normal
- **WHEN** the owned UI exits successfully
- **THEN** cleanup SHALL remain idempotent and preserve the accepted exit transcript or resume-hint behavior without duplicate output

### Requirement: Fatal diagnostics survive terminal restoration without exposing prompt payloads
For a fatal owned-UI failure, A1 SHALL emit a bounded plain diagnostic after terminal restoration and attempt to retain a bounded local diagnostic record containing release/runtime identity, failure origin, sanitized error classification, and useful stack locations. It SHALL exclude prompt text, image/base64 data, credentials, and raw terminal input. Diagnostic persistence failure SHALL not prevent cleanup or change a fatal outcome into success.

#### Scenario: Fatal attachment-related error is recorded
- **WHEN** a fatal diagnostic originates from an attachment-related path
- **THEN** the retained record SHALL allow identification of the failing code path without storing the attachment or prompt
- **AND** the restored-terminal message SHALL identify the local record when persistence succeeds

#### Scenario: Diagnostic storage is unwritable
- **WHEN** local diagnostic storage cannot be written
- **THEN** A1 SHALL still attempt terminal restoration and emit a bounded fallback error without hanging

### Requirement: Scoped-model shortcut hints preserve pinned platform presentation
The owned scoped-model selector SHALL display every shortcut hint from its effective binding identities using pinned Pi's platform-specific key labels before styling and layout. On macOS, an Alt modifier SHALL display as `option`; on Windows and Linux it SHALL retain `alt`. The selector SHALL preserve the pinned spelling of other key parts, alternative-binding order and separators, and empty-binding presentation. For equivalent model state, bindings, theme, color mode, and terminal width, its header and footer SHALL match pinned Pi's visible text, semantic ANSI, spacing, padding, and wrapping. Display formatting SHALL NOT alter binding identities, shortcut matching, model ordering, session-only changes, explicit persistence, refresh outcomes, or cancellation behavior.

#### Scenario: Default reorder hints on macOS
- **WHEN** the scoped-model selector renders on macOS with the default reorder bindings
- **THEN** its footer SHALL display `option+up/option+down reorder`
- **AND** the formatted text SHALL wrap and align exactly as pinned Pi at the same width, including the observed 80-column case
- **AND** input matching SHALL continue to use the logical `alt+up` and `alt+down` bindings

#### Scenario: Default reorder hints on Windows or Linux
- **WHEN** the scoped-model selector renders on Windows or Linux with the default reorder bindings
- **THEN** its footer SHALL retain `alt+up/alt+down reorder` and the pinned layout for that platform

#### Scenario: Effective custom bindings contain alternatives
- **WHEN** a scoped-model action has an effective custom binding or an ordered list of alternatives
- **THEN** every displayed alternative SHALL use pinned platform formatting without changing its order or non-Alt key parts
- **AND** the header's save hint and every footer hint SHALL follow the same display rules
- **AND** the configured bindings SHALL still trigger their original actions

#### Scenario: An action is unbound
- **WHEN** a scoped-model action has no effective keys
- **THEN** its hint SHALL match pinned Pi's empty-binding presentation without inventing a default shortcut or command fallback

#### Scenario: Selector state changes after presentation
- **WHEN** the user changes enabled models or their order, saves changes, or receives a catalog refresh outcome
- **THEN** refreshed help SHALL retain platform-correct key labels and pinned state-dependent text and styling
- **AND** model changes SHALL remain session-only until explicitly saved, and cancellation SHALL preserve its existing semantics

### Requirement: Project trust options use canonical filesystem identities
The owned `/trust` surface SHALL derive project and parent trust-option labels, saved-selection identities, and persistence targets from the real filesystem identity of the resolved project directory, matching pinned Pi. It SHALL derive the parent from that canonical project identity, not by independently resolving the lexical parent. The displayed cwd heading SHALL retain the equivalent pinned session-cwd presentation rather than being rewritten merely to match trust-option identities. When real-path lookup fails, option construction SHALL fall back to the resolved project path as pinned Pi does, without granting trust or changing trust-store error handling.

#### Scenario: Open trust through a directory alias
- **WHEN** the session cwd names a symlink or directory junction whose resolved target differs from its lexical path
- **THEN** the project and parent options SHALL use the target's canonical identity for labels, saved-path matching, and updates
- **AND** the cwd heading SHALL retain the session-cwd presentation
- **AND** the parent option SHALL name the canonical target's parent even when the alias resides under a different parent

#### Scenario: Reopen a saved trust decision through an alias
- **WHEN** a saved trusted or untrusted decision applies to a project opened through an alias
- **THEN** the saved-decision text, inherited indication, selected option, and checkmark SHALL match pinned Pi for that same decision
- **AND** a direct canonical project decision SHALL NOT be presented as inherited merely because the session cwd uses an alias

#### Scenario: Trust the parent of an aliased project
- **WHEN** the user explicitly confirms the parent trust option
- **THEN** persistence SHALL trust the canonical target's parent and remove the canonical project's overriding decision
- **AND** it SHALL NOT instead trust the lexical alias's parent or alter unrelated trust entries
- **AND** the active session's trust state SHALL remain unchanged and the existing restart-required status SHALL be shown

#### Scenario: Save a project decision or cancel
- **WHEN** the user explicitly trusts or denies the project, or cancels the selector
- **THEN** trust or denial SHALL update only the canonical project's decision and preserve the existing restart-required behavior
- **AND** cancellation SHALL close the selector without changing persisted or active-session trust
- **AND** these interactions SHALL NOT load project-scoped resources or bypass startup trust preflight

#### Scenario: Open trust at a filesystem root
- **WHEN** the canonical project directory is a filesystem root
- **THEN** the selector SHALL omit the parent option and retain the project trust and denial options

#### Scenario: Canonicalization cannot resolve the project
- **WHEN** real-path lookup fails, including for a missing directory
- **THEN** option construction SHALL use the resolved project path and its lexical parent with the same root exclusion and option order as pinned Pi
- **AND** fallback SHALL NOT itself grant trust, suppress a separate trust-store failure, or migrate persisted decisions

### Requirement: Trust path parity retains independent styled-row evidence
For equivalent cwd inputs, filesystem alias topology, saved trust data, and current-session trust, the owned trust selector SHALL match independently captured pinned-Pi rows and action effects at 80 and 28 columns, dark/light themes, both existing output-padding variants, and truecolor/256-color. Evidence SHALL retain path spelling, semantic ANSI, selected/checkmarked state, and wrapping; canonical path differences SHALL NOT be masked by a new normalization or exception.

#### Scenario: Compare canonical and aliased trust paths
- **WHEN** independent producers render trust with ordinary and aliased cwd inputs, including native macOS temporary-directory aliases
- **THEN** complete styled rows SHALL match for open, saved/inherited, confirmed, and cancelled states
- **AND** confirmed persistence targets and cancellation's absence of writes SHALL match the pinned behavior

#### Scenario: Detect path or presentation regressions
- **WHEN** the owned capture substitutes a lexical parent for a distinct canonical parent, changes semantic ANSI, or changes wrapping
- **THEN** the parity gate SHALL fail rather than accepting the mutated result

### Requirement: Bounded engine delivery supersedes only equivalent replaceable state
The owned UI SHALL bound pending event count and retained queue payload without evicting arbitrary older notifications. Intermediate complete state updates SHALL be superseded only by a newer equivalent update for the same entity, session generation, and semantic ordering segment. Updates for different transcript blocks SHALL NOT displace one another without an explicit authoritative reconciliation that preserves all final content. Coalescing SHALL NOT remove or reorder command outcomes, lifecycle/run transitions, assistant-message completion semantics, tool finalization, or other side-effect-bearing events. A newer generation SHALL NOT receive an obsolete generation's state. Sequence stamping, listener registration, the bounded queue, the per-turn drain, generation invalidation, and the overload transition SHALL be one delivery component owned by the engine adapter and testable without the adapter: it SHALL obtain the session id, generation, lazily materialized blocks, asset retention, pending-command membership, cancellation, reconciliation, and listener-failure reporting through explicit ports, while the adapter alone decides what each event means and how a saturated session is rebuilt.

#### Scenario: One block emits a large streaming burst
- **WHEN** many accumulated updates for the same live block arrive before delivery
- **THEN** pending replaceable state SHALL converge to its newest complete revision without retaining every intermediate payload
- **AND** after drain the displayed block SHALL contain all final content, with no event-backpressure warning

#### Scenario: Several blocks stream concurrently
- **WHEN** updates alternate among distinct assistant, thinking, and tool blocks
- **THEN** every block's newest required state SHALL remain deliverable or recoverable from authoritative state
- **AND** pressure on one block SHALL NOT silently erase another block's content or completion

#### Scenario: A semantic boundary follows pending partial state
- **WHEN** completion, settlement, a command outcome, or a side-effect-bearing status transition follows pending intermediate updates
- **THEN** delivery SHALL preserve the boundary's required state and source ordering
- **AND** a later partial SHALL NOT revive finished content, clear unrelated working state, duplicate an action, or overwrite the post-boundary view

#### Scenario: Switch sessions with events pending
- **WHEN** a session generation is replaced while old state remains queued
- **THEN** old events SHALL NOT mutate the new transcript, editor, suggestions, status, or pending commands
- **AND** accepted old operations SHALL be settled or invalidated through their defined lifecycle rather than silently forgotten

#### Scenario: Deliver events without an engine
- **WHEN** the delivery component is driven directly with emitted events, a replaced generation, a saturating burst, and a throwing listener
- **THEN** it SHALL stamp and deliver events in order one per event-loop turn, coalesce a live block to its newest revision, invalidate the replaced generation's state, reserve pending command outcomes through one overload and hand them to the reconciliation port in arrival order, and report the listener failure through its port
- **AND** the adapter SHALL observe the same ordering, coalescing, invalidation, and recovery through its public delivery surface

### Requirement: Event saturation has bounded explicit recovery rather than silent semantic loss
If capacity is exhausted by nonreplaceable work, the adapter SHALL use a defined bounded overload transition rather than discarding control events, growing without limit, or claiming successful delivery. Accepted pending operations SHALL receive their ordered result or an explicit typed failure/cancellation disposition. Any recovery SHALL reconcile the authoritative session state and prevent stale events from being replayed into the recovered generation. Supported ordinary streaming bursts SHALL NOT require this exceptional path. Technical overflow telemetry SHALL remain outside the normal UI.

#### Scenario: Pending work contains only protected events
- **WHEN** a synthetic nonreplaceable-event flood exhausts the protected delivery allowance
- **THEN** the adapter SHALL enter controlled recovery and stop admitting new ordinary work until its state is reconciled or the affected run is safely stopped
- **AND** no pending command SHALL hang or be reported successful solely because its outcome was discarded
- **AND** recovery/control capacity SHALL remain available without an unbounded emergency queue

#### Scenario: Explicitly flush pending delivery
- **WHEN** a caller requests a flush after a supported streaming burst
- **THEN** the flush SHALL settle only after required final state and semantic events have been delivered
- **AND** an overload or disposal that prevents delivery SHALL produce an explicit result rather than a false successful flush or indefinite wait

### Requirement: Pressure handling remains cooperative and invisible to ordinary users
Engine-event pressure SHALL be handled without delaying keyboard, pointer, or timer turns until the stream drains and without bypassing the existing presentation cadence. Normal coalescing SHALL be an internal optimization rather than a warning condition. Event-pressure counts, diagnostics, and recovery telemetry SHALL NOT enter notifications, status text, transcript, stdout, stderr, or post-exit terminal output. Developer diagnostics SHALL use bounded counters and classified transitions rather than accumulating a message every fixed number of superseded events. This restriction SHALL NOT suppress genuine user-command or provider errors unrelated to background pressure telemetry.

#### Scenario: Type while output outpaces presentation
- **WHEN** a long transcript receives sustained high-rate output while the user types, scrolls, or cancels
- **THEN** input and timed indicators SHALL continue to receive event-loop turns and current-state presentation
- **AND** streaming work per update SHALL not grow with historical transcript length
- **AND** no coalescing/backpressure notice SHALL appear in any normal user-facing output channel

#### Scenario: Inspect internal pressure evidence
- **WHEN** a developer explicitly inspects diagnostics after a burst
- **THEN** bounded evidence SHALL distinguish safely superseded state, protected queue depth, and actual overload recovery
- **AND** those counters SHALL NOT be mirrored to user-visible diagnostic lists or statuses

### Requirement: Quiet pressure handling has combined correctness evidence
Acceptance SHALL verify both absence of technical messages and successful history/event recovery under combined load. Warning-string removal, larger arbitrary queues, longer synchronous drains, or timeouts alone SHALL NOT satisfy the change.

#### Scenario: History contention overlaps a streaming burst
- **WHEN** isolated validation holds the history database beyond its former short timeout while producing high-rate assistant/tool updates and interactive input, then releases the lock
- **THEN** eligible history writes and refresh SHALL recover, final transcript and control outcomes SHALL match authoritative state, and input SHALL remain responsive
- **AND** queue/worker/timer budgets SHALL remain bounded
- **AND** captured normal UI and terminal output SHALL contain no history, coalescing, backpressure, or recovery notices

### Requirement: Forward prompt navigation includes the transcript bottom

In the bare-A1 custom transcript viewport, Shift+Down SHALL navigate to the next submitted prompt or completed compaction when one exists after the current navigation stop. When the transcript contains at least one submitted prompt or completed compaction and no later anchor exists, Shift+Down SHALL perform the same bottom-navigation transition as Ctrl+End: reach the final legal scroll position, resume following output, and clear the pending-new-message count. Shift+Up SHALL retain its existing reverse prompt navigation, including the opening spacer at the first-prompt stop. This behavior SHALL NOT change the pinned `a1 pi` route or override modal input ownership.

#### Scenario: Navigate forward through prompts and then to the bottom
- **WHEN** the user repeatedly presses Shift+Down from an earlier anchor in a transcript with multiple prompts or completed compactions and a response tail below the last anchor
- **THEN** each later prompt or completed compaction SHALL remain a navigation stop in order
- **AND** one further Shift+Down from the last anchor SHALL reach the bottom instead of remaining at that anchor

#### Scenario: Resume live output like Ctrl+End
- **WHEN** the user presses Shift+Down from the last prompt or completed compaction while detached from the bottom with pending new messages
- **THEN** the viewport SHALL reach the same scroll position and following state as pressing Ctrl+End from the same state
- **AND** the pending-new-message count SHALL clear
- **AND** subsequent output SHALL remain followed at the bottom

#### Scenario: Reverse from the bottom
- **WHEN** the user presses Shift+Up after reaching the bottom with Shift+Down and the last anchor lies above the bottom scroll position
- **THEN** the viewport SHALL return to the last prompt or completed compaction
- **AND** further Shift+Up presses SHALL visit earlier anchors, preserving the first anchor's opening spacer
- **AND** Shift+Down SHALL allow navigation forward to the bottom again

#### Scenario: Navigate from within the final response
- **WHEN** the viewport is detached within content after the last prompt or completed compaction and the user presses Shift+Down
- **THEN** the viewport SHALL perform the same bottom-navigation transition as Ctrl+End

#### Scenario: Only one submitted prompt or completed compaction
- **WHEN** the user presses Shift+Down from the first-prompt stop in a single-prompt transcript whose response extends below the viewport
- **THEN** the viewport SHALL reach the bottom and resume following without stopping on the prompt's opening spacer

#### Scenario: Already at the bottom or the transcript fits
- **WHEN** the user presses Shift+Down while already following the bottom, including when the entire transcript fits within the viewport
- **THEN** the viewport SHALL remain at the bottom in following mode without wrapping to an earlier prompt

#### Scenario: No submitted prompts or completed compactions
- **WHEN** the user presses Shift+Down in the custom viewport with no submitted prompt or completed compaction anchors
- **THEN** the viewport's scroll position and following state SHALL remain unchanged

#### Scenario: Preserve input ownership and supported encodings
- **WHEN** any currently supported Shift+Down encoding reaches active custom-viewport navigation
- **THEN** it SHALL trigger the same forward-navigation behavior and remain consumed without modifying the editor draft
- **AND** when a modal owns input or custom-viewport navigation is disabled, existing input routing SHALL remain unchanged

### Requirement: Above-prompt autocomplete is a declared bare-A1 presentation replacement
Bare A1 SHALL declare above-prompt autocomplete with a matching top line as a placement-and-decoration replacement for the ordinary editor's pinned below-prompt list. This named exception SHALL supersede pinned row-order, top-line decoration and counter relocation, and resulting editor-anchor parity only for that surface. The additional line SHALL match the prompt border's current color, glyph, and width and appear only while the menu has rendered rows; candidate rows SHALL retain their existing rendering, including background and padding. The existing trailing completion counter SHALL move into the top line without parentheses, at the history border label inset and in its dim color, with its old row removed. Its selected-item/total meaning, visibility conditions, and updates SHALL remain unchanged; this is not a new page-count calculation. The replacement SHALL NOT apply menu-panel shading. The related bare-A1 history border label SHALL omit only its `History` title, retaining its numeric value, dim color, inset, and overflow suffix. Menu sizing and clipping, editor choice, history behavior, contextual suggestions, settings, extensions, and unrelated shell behavior SHALL otherwise retain their existing contracts.

The replacement SHALL apply to slash-command, command-argument, path/resource, and extension-provider completions displayed by the default editor, with persistent history both enabled and disabled. It SHALL preserve candidate ordering, labels, descriptions, semantic styling, selection, the existing pagination and visible-item policy, configured keys, Tab/Enter application or submission semantics, asynchronous provider lifecycle, and Escape cancellation except for the separately declared sole slash-command search clearing. On every selected row that renders a description, the selection arrow and primary candidate SHALL use the selected accent role while the aligned description SHALL retain the ordinary muted description role. A selected row without a rendered description SHALL retain the ordinary selected styling. The replacement SHALL NOT reverse the list or change navigation direction merely because the list is above the prompt. Active autocomplete SHALL retain priority over contextual ghost suggestions.

The `a1 pi` comparison route, untouched pinned Pi, and extension-owned replacement editors SHALL retain their existing presentation and input ownership. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement this replacement.

#### Scenario: Complete commands and arguments
- **WHEN** equivalent input invokes slash-command or argument completion in bare A1
- **THEN** the same candidates, active-item behavior, and completion or command outcome SHALL remain available above the prompt
- **AND** Up and Down SHALL retain their established selection direction and configured keybindings

#### Scenario: Style a selected candidate description
- **WHEN** bare A1's default-editor autocomplete selects a command, argument, resource, or extension candidate that renders a description
- **THEN** the selection arrow and primary candidate SHALL be accented
- **AND** the description SHALL remain muted exactly as it is on an unselected row

#### Scenario: Complete paths or provider resources
- **WHEN** a path/resource provider or an extension autocomplete provider returns candidates for the default editor
- **THEN** its normal results SHALL use the same above-prompt placement
- **AND** provider invocation, cancellation, selected value, and application behavior SHALL remain unchanged

#### Scenario: Use either history mode
- **WHEN** bare A1 opens autocomplete with persistent history enabled or disabled
- **THEN** the list and matching top line SHALL appear above the prompt in both modes
- **AND** each mode SHALL retain its existing editor path, recall, draft, undo, paste, and history-indicator semantics without activating durable history when disabled

#### Scenario: Keep autocomplete priority
- **WHEN** the default editor has an active completion list
- **THEN** Tab and the visible suggestion surface SHALL belong to autocomplete rather than contextual ghost suggestions
- **AND** accepting or canceling completion SHALL retain the established editor behavior

#### Scenario: Restore the default editor after an extension replacement
- **WHEN** an extension-owned editor is mounted and later unmounted
- **THEN** the extension editor SHALL retain its own presentation, focus, and input while mounted
- **AND** restoring the default editor SHALL restore above-prompt autocomplete and its matching top line without stale menu/line rows or hit regions

#### Scenario: Compare with pinned Pi
- **WHEN** equivalent completion input runs through `a1 pi` and untouched pinned Pi
- **THEN** their list placement, editor coordinates, candidates, interactions, and selected-row styling SHALL retain their pinned behavior
- **AND** neither comparison producer SHALL gain the new top line, relocate its original counter, or receive bare A1's split selected-description styling
- **AND** only bare A1's explicitly declared placement, top-line, counter-relocation, selected-description styling, and sole slash-command search clearing differences SHALL be treated as expected autocomplete deviations

### Requirement: Rendering stability is proven from terminal paint evidence
A rendering-affecting change to the owned shell SHALL be validated with bounded terminal-paint evidence in addition to semantic row snapshots. The evidence SHALL independently exercise bare A1, the pinned `a1 pi` comparison, and untouched pinned Pi under equivalent profile state, terminal geometry, theme, capabilities, transcript, deterministic stream updates, and input checkpoints. It SHALL distinguish the default regular-mode comparison from a mode-matched fullscreen comparison so differences caused by terminal ownership are not misattributed to transcript content.

For each checkpoint the evidence SHALL record the resulting cell frame and classify terminal writes including presentation cadence, bytes, cleared and rewritten rows, full-screen clears, viewport shifts, stable-row rewrites, synchronized-update boundaries, and dock geometry. Producer failure, timeout, malformed output, unbounded evidence, or an unexplained difference SHALL fail the gate.

#### Scenario: Compare default user-visible paths
- **WHEN** the rendering analysis compares bare `a1`, default `a1 pi`, and default untouched Pi
- **THEN** all producers SHALL receive equivalent deterministic state and actions
- **AND** the result SHALL identify that bare A1 uses its declared fullscreen custom viewport while the default comparison paths use their configured Pi mode
- **AND** visible instability SHALL not be dismissed merely because final semantic text matches

#### Scenario: Isolate fullscreen viewport behavior
- **WHEN** the analysis investigates a difference that may be caused by regular versus fullscreen terminal ownership
- **THEN** it SHALL also compare bare A1 with `a1 pi` and untouched Pi configured to the same fullscreen mode and geometry
- **AND** it SHALL attribute differences separately to the fullscreen renderer, custom viewport composition, and transcript component output

#### Scenario: Capture a deterministic streaming workload
- **WHEN** prose, incomplete Markdown, thinking, tool output, fit/overflow crossing, a long transcript, resize, or detached scrolling is replayed
- **THEN** the evidence SHALL include complete cell frames and paint classifications at declared checkpoints
- **AND** it SHALL detect a full-screen clear, stable-row rewrite, dock jump, blank intermediate state, missed final state, or excessive frame cadence outside the workload's declared allowance

#### Scenario: Terminal lacks synchronized-update support
- **WHEN** the same workload is evaluated without synchronized terminal updates
- **THEN** rendering SHALL remain free of blank or partially cleared intermediate frames through bounded damage and write ordering
- **AND** unsupported synchronization SHALL be recorded rather than treated as successful atomic presentation

#### Scenario: Comparison producer fails
- **WHEN** bare A1, `a1 pi`, or untouched Pi exits unexpectedly, times out, or cannot produce a declared checkpoint
- **THEN** the rendering-stability gate SHALL fail
- **AND** it SHALL retain bounded diagnostics and clean up every isolated process tree

#### Scenario: Repeat the same evidence command
- **WHEN** the rendering evidence is run repeatedly against the same artifact and workload
- **THEN** producer startup and completion SHALL remain within declared per-workload bounds
- **AND** semantic results and paint classifications SHALL be deterministic
- **AND** every reported finding SHALL be derived from captured checkpoints rather than a hard-coded description of an earlier implementation state

### Requirement: Damage-aware painting uses an A1-owned public boundary
Bare A1 SHALL implement damage-aware fullscreen presentation through an A1-owned adapter over documented public terminal/runtime ports. The adapter SHALL receive authoritative semantic frame metadata from the owned viewport, SHALL NOT infer transcript semantics from terminal bytes, and SHALL transform only the finite pinned fullscreen-write grammar covered by conformance fixtures. A grammar, capability, safety, or geometry mismatch SHALL fail closed by forwarding the original Pi write unchanged. The adapter SHALL NOT require an upstream Pi change, inspect private Pi state, patch prototypes, edit installed package files, or alter `a1 pi` and untouched Pi comparison paths.

#### Scenario: Rewrite a declared safe shift
- **WHEN** the owned viewport declares a safe transcript shift and the corresponding Pi terminal write matches the pinned conformance grammar
- **THEN** the A1-owned adapter SHALL emit bounded transcript-region movement plus only exposed or genuinely damaged row paints
- **AND** dock rows and cursor placement SHALL remain correct

#### Scenario: Reject an unproven transformation
- **WHEN** the semantic descriptor is absent or unsafe, or the terminal write does not exactly match the declared grammar, geometry, and capabilities
- **THEN** the adapter SHALL forward the original terminal write without partial transformation
- **AND** it SHALL expose a bounded cause classification to rendering evidence

#### Scenario: Run a comparison producer
- **WHEN** `a1 pi`, regular-mode A1, or untouched pinned Pi renders the equivalent workload
- **THEN** the A1-owned damage adapter SHALL not be active
- **AND** the producer's package identity and terminal writes SHALL remain unchanged

### Requirement: Stream presentation cadence is bounded without changing semantics
The owned shell SHALL coalesce high-frequency semantic updates to a declared presentation cadence while preserving source order, final content, immediate input feedback, status animation, tool completion, errors, and lifecycle transitions. The cadence gate SHALL count terminal presentation frames, not only engine events or render requests. A sustained stream SHALL not produce more terminal frames than the declared cadence permits, and completion SHALL flush the newest state without first presenting superseded pending states.

#### Scenario: Chunks arrive faster than presentation cadence
- **WHEN** assistant or tool updates arrive faster than the declared presentation interval
- **THEN** terminal frame count SHALL remain bounded by that interval
- **AND** the newest complete state for each interval SHALL be presented

#### Scenario: Stream completes between scheduled frames
- **WHEN** a stream's final event arrives while an earlier presentation is pending
- **THEN** the pending state SHALL be superseded by the final state
- **AND** the final transcript and lifecycle surfaces SHALL be presented without waiting for another ordinary interval

#### Scenario: Status animation overlaps content streaming
- **WHEN** a timed working indicator and transcript updates are active together
- **THEN** each SHALL retain its declared cadence and current state
- **AND** coalescing transcript updates SHALL not stall or multiply status animation frames

### Requirement: Bare-A1 word editing treats filesystem paths as one token
The bare-A1 prompt editor SHALL recognize a whitespace-delimited filesystem path with a drive-rooted, UNC, POSIX-rooted, dot-relative, parent-relative, or home-relative prefix as one semantic word. A matching singly or doubly quoted path SHALL allow spaces and include its balanced quotes in the token. Path recognition SHALL be syntactic and SHALL NOT access the filesystem.

Ctrl+Left from the end of a recognized path or from within it SHALL move directly to the path's beginning, and Ctrl+Right from the beginning or within it SHALL move directly to its end, without intermediate stops at `/`, `\\`, `:`, `.`, `_`, or `-`. Ctrl+Backspace at the path end and Ctrl+Delete at its beginning SHALL delete the complete path token. When deletion begins within a path, it SHALL delete only the portion between the caret and the corresponding path boundary.

#### Scenario: Navigate a Windows path
- **WHEN** the bare-A1 prompt contains `D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl` and the user invokes word-left at its end or word-right at its beginning
- **THEN** the caret SHALL move directly to the opposite path boundary without stopping at internal punctuation

#### Scenario: Delete a Windows path
- **WHEN** the caret is at the end of that Windows path and the user invokes delete-word-backward, or is at its beginning and invokes delete-word-forward
- **THEN** the complete path SHALL be removed by the single action

#### Scenario: Navigate a quoted path containing spaces
- **WHEN** the bare-A1 prompt contains a balanced quoted path such as `"D:/Project Files/source/file.ts"`
- **THEN** word navigation and deletion SHALL treat the opening quote, path contents, spaces, and closing quote as one token

#### Scenario: Navigate other explicit path forms
- **WHEN** the prompt contains a UNC path, POSIX-rooted path, dot-relative path, parent-relative path, or home-relative path
- **THEN** the same path-token navigation and deletion behavior SHALL apply regardless of slash direction

#### Scenario: Begin inside a path
- **WHEN** the caret is inside a recognized path
- **THEN** word-left and delete-word-backward SHALL use the path's beginning as their boundary
- **AND** word-right and delete-word-forward SHALL use the path's end as their boundary

### Requirement: Path-aware word editing preserves other editor semantics
Path-aware word boundaries SHALL affect only semantic word movement and word deletion in the bare-A1 prompt editor. Character movement and deletion SHALL remain grapheme-based, and path deletion SHALL retain the editor's established undo, kill-ring, change notification, history, selection, and autocomplete behavior. Existing prompt-chip atomicity SHALL remain unchanged. Non-path prose SHALL retain Pi's punctuation-oriented word boundaries, and the `a1 pi` comparison profile SHALL retain pinned Pi behavior.

#### Scenario: Edit a path one character at a time
- **WHEN** the user invokes unmodified Left, Right, Backspace, or Delete on a recognized path
- **THEN** the editor SHALL move or delete one complete grapheme rather than the whole path

#### Scenario: Undo or yank a deleted path
- **WHEN** a path is removed with a word-deletion action
- **THEN** undo SHALL restore the pre-deletion prompt
- **AND** the deleted path SHALL participate in the existing kill-ring behavior for that direction

#### Scenario: Navigate punctuation in ordinary prose
- **WHEN** a prompt token does not match a recognized filesystem-path form
- **THEN** word movement and deletion SHALL preserve pinned Pi's existing punctuation boundaries

#### Scenario: Use a prompt chip
- **WHEN** the prompt contains an existing file, folder, URL, image, or paste chip
- **THEN** its existing atomic navigation, deletion, selection, rendering, and submission behavior SHALL remain unchanged

#### Scenario: Use the Pi comparison profile
- **WHEN** the same path text is edited through `a1 pi`
- **THEN** word movement and deletion SHALL retain the pinned Pi boundary behavior rather than the bare-A1 path-aware override

### Requirement: Bare A1 declares shared input and status-level presentation
Bare A1 SHALL use the shared agent/search input presentation and status-level color behavior as an explicit A1-owned customization over the pinned shell. This customization SHALL supersede pinned editor border coloring and thinking-label styling only in bare A1; it SHALL NOT change pinned `a1 pi` presentation, extension-provided custom editors, engine semantics, or other footer values. Bare-A1 keyboard defaults SHALL follow the declared level-cycle and model-selector shortcut policy instead of pinned defaults.

#### Scenario: Open the pinned comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** editor thinking-level and bash-mode border colors, footer presentation, Shift+Tab level cycling, and Ctrl+L model selection SHALL retain pinned behavior

#### Scenario: Use the owned agent input
- **WHEN** the user starts bare A1 with its default agent editor
- **THEN** the input SHALL use the shared neutral rules and undimmed prefix specified for Settings search
- **AND** prompt history, paste chips, selection and copy, suggestions, streaming, submission, and bash execution SHALL retain their existing semantics

### Requirement: The status-bar level name carries the existing thinking color
Bare A1 SHALL color the status-bar thinking-level name with the same active-theme mapping previously used for that level's editor bars. The level label SHALL update from authoritative session state after level cycling, setting changes, model changes, and session restoration. Only the level name SHALL receive that color; surrounding model, provider, usage, path, separators, and extension statuses SHALL retain their existing presentation. A selected model with level off SHALL show an off label using the existing off-level mapping; when no model is selected, the footer SHALL NOT invent an active level. Unsupported levels SHALL continue to use the engine's supported-level and clamping behavior rather than introducing a new cycle order.

#### Scenario: Cycle supported levels
- **WHEN** the user cycles through a model's supported levels
- **THEN** the visible level name SHALL update to the authoritative level and use the corresponding previous bar color
- **AND** both input bars SHALL remain neutral and the level color SHALL NOT be muted by surrounding footer styling

#### Scenario: Disable thinking
- **WHEN** the selected model's authoritative level becomes off
- **THEN** the status bar SHALL display the off label in the existing off-level color and the input bars SHALL remain neutral

#### Scenario: Change models or restore a session
- **WHEN** a model change or session restoration changes the effective thinking level
- **THEN** the footer SHALL display and color that effective level rather than retaining the prior model's label or color

#### Scenario: Render without an active model
- **WHEN** no model is selected
- **THEN** the existing no-model status SHALL remain and no active thinking-level label SHALL be fabricated

#### Scenario: Fit a narrow terminal
- **WHEN** the footer must omit provider text or truncate its right-hand content to fit
- **THEN** its existing width and truncation policy SHALL remain intact and any visible level-name span SHALL retain its level foreground without coloring adjacent text

### Requirement: Graceful user quit returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

#### Scenario: An extension retains an event-loop handle
- **WHEN** owned UI cleanup has completed but a loaded extension leaves a server, timer, or comparable event-loop handle active
- **THEN** the interactive A1 executable SHALL preserve completed terminal restoration and configured exit output
- **AND** it SHALL still terminate successfully and return control to the parent shell

#### Scenario: Repository-local quit returns promptly
- **WHEN** a user quits an interactive A1 session launched through the supported repository-local development command
- **THEN** development-only cache persistence SHALL NOT introduce a visible post-restoration pause before the parent-shell prompt appears
- **AND** production compile-cache behavior and completed owned cleanup SHALL remain unchanged

#### Scenario: Describe the quit command
- **WHEN** slash-command autocomplete presents the built-in `quit` command
- **THEN** its description SHALL be `Quit`
- **AND** the description SHALL NOT include `Pi`, `A1`, or another product qualifier

### Requirement: Escape clears a sole slash-command search in bare A1
Bare A1 SHALL declare Escape on a sole top-level slash-command search as an input exception to pinned autocomplete cancellation. A sole top-level slash-command search is single-line default-editor content consisting of `/` followed by zero or more non-whitespace characters, including further `/` characters, with the cursor at its end and the slash-command menu open. When Escape is pressed in that state, the default editor SHALL close the menu and clear the prompt so the editor returns to its empty state, and SHALL NOT invoke the shell interrupt handler. The cleared text SHALL remain reachable through the editor's existing undo. Every other Escape path SHALL retain its existing contract: an open argument, path/resource, or extension-provider menu, a command search containing whitespace, multi-line content, and a cursor away from the end of the search SHALL only close the menu, and an editor without an open menu SHALL continue to route Escape to the shell interrupt handler. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain pinned close-only cancellation.

#### Scenario: Escape a bare slash
- **WHEN** the user types `/` in bare A1 so the slash-command menu opens and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty
- **AND** the shell interrupt handler SHALL NOT run

#### Scenario: Escape a partial command name
- **WHEN** the user types `/mod` or `/skill:r` in bare A1 with the menu open and the cursor at the end and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty

#### Scenario: Escape a search with further slashes
- **WHEN** the user types `////` or `/sk/rev` in bare A1 so the slash-command menu opens with the cursor at the end and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty
- **AND** the shell interrupt handler SHALL NOT run

#### Scenario: Escape any other menu
- **WHEN** the user presses Escape with an open argument, path/resource, or extension-provider menu, or with a command search that already contains whitespace
- **THEN** the menu SHALL close and the editor text SHALL remain unchanged

#### Scenario: Compare with the pinned editor
- **WHEN** the same `/mod` input and Escape run through the `a1 pi` comparison profile
- **THEN** the menu SHALL close and `/mod` SHALL remain in the editor exactly as in pinned Pi

### Requirement: Compaction progress is estimated in the working status
While a compaction is shown, bare A1 SHALL estimate its progress from the summarization stream and present it in the working status as `Compacting (n%)` beside the spinner, where `n` is an integer percent. The engine adapter SHALL observe the stream through the session agent's public stream function only between the compaction's start and end, SHALL count streamed summary text against an expected summary size taken from the previous compaction summary on the current branch or a fixed default when there is none, and SHALL publish the percent as engine status data separate from the semantic `Compacting` word. The percent SHALL start at 0 when the stream begins, SHALL never decrease within one compaction, SHALL NOT reach 100 while the compaction is still running, and SHALL be removed together with the compacting state when compaction ends. When the stream cannot be observed the status SHALL remain `Compacting`. This SHALL be a declared bare-A1 presentation difference; the `a1 pi` comparison route SHALL keep its existing `Compacting` label.

#### Scenario: Watch a compaction progress
- **WHEN** a compaction streams its summary and the branch holds a previous summary of 4,000 characters
- **THEN** bare A1 SHALL show `Compacting (0%)...` when the stream starts and `Compacting (50%)...` after 2,000 characters have streamed
- **AND** the label SHALL show at most `Compacting (99%)...` until the compaction ends, after which no compaction label SHALL remain

#### Scenario: First compaction without a previous summary
- **WHEN** the branch holds no previous compaction summary
- **THEN** the percent SHALL be measured against the fixed default size and SHALL still be clamped below 100 while running

#### Scenario: Stream is not observable
- **WHEN** the session agent exposes no callable stream function
- **THEN** the status SHALL show `Compacting...` without a percent and compaction SHALL proceed unchanged

#### Scenario: Comparison route
- **WHEN** the same compaction runs through `a1 pi`
- **THEN** the status SHALL show `Compacting...` without a percent

### Requirement: Input during compaction joins the pending queue and is delivered when compaction ends
A steering or follow-up submission made while a compaction is in progress SHALL be queued through the engine's own steering and follow-up queue with its attachments, SHALL appear immediately in the pending `Steering:` rows with the same edit hint as queued steering during a run, and SHALL be returned to the editor by the same dequeue action. Extension slash commands SHALL execute immediately as during a run. No submission made during compaction SHALL be dropped or replaced by a notice. When an automatic compaction ends, the engine's continuing run or pending prompt SHALL consume the queue. When a manual compaction ends, in any outcome, the engine adapter SHALL start one run from the first queued message with that message's mode and attachments and SHALL keep the remaining messages queued for that run, so every queued message reaches the agent in submission order; a failed start SHALL restore the queue and report a diagnostic.

#### Scenario: Queue during manual compaction
- **WHEN** the user submits `first` and then `second` while `/compact` is running
- **THEN** both SHALL appear as `Steering:` rows during the compaction
- **AND** when the compaction ends `first` SHALL start a run and `second` SHALL be injected into that run

#### Scenario: Queue during automatic compaction
- **WHEN** the user submits messages while a threshold compaction runs after a turn or before a pending prompt
- **THEN** they SHALL appear as `Steering:` rows and SHALL be delivered by the continuing run or the pending prompt without a separate start from the adapter

#### Scenario: Dequeue during compaction
- **WHEN** the user presses Alt+Up while messages are queued during compaction
- **THEN** every queued message SHALL return to the editor and none SHALL be sent when the compaction ends

#### Scenario: Attachments travel with a queued message
- **WHEN** a message queued during compaction carries an image attachment
- **THEN** the message delivered after compaction SHALL carry the same attachment

#### Scenario: Delivery fails to start
- **WHEN** starting the run from the first queued message after a manual compaction fails
- **THEN** the queued messages SHALL remain in the pending rows and a diagnostic SHALL be shown

### Requirement: Bare A1 unifies model selection and scope management
Bare A1 SHALL expose one `/models` command for selecting the active model and managing the model scope used by cycling. Bare A1 SHALL NOT advertise or execute `/model` or `/scoped-models` as compatibility aliases. The pinned `a1 pi` comparison profile SHALL retain its existing `/model` and `/scoped-models` routes and presentations.

The Models dialog SHALL use the available authenticated model catalog and SHALL present an `all` filter and a `scoped` filter, searchable model rows ordered by provider and model identifier, the selected model's display name, and the effective model-scope state. Each row SHALL render its scope marker before the model identifier and its provider as `[provider]`. The active-model checkmark SHALL render immediately after `[provider]`, not before the provider or in another column.

Space SHALL toggle the selected model's membership in the session's cycling scope without closing the dialog. Tab SHALL switch the filter while preserving the applicable query and selection. Enter SHALL select the highlighted model, persist it as the default through the existing model-selection policy, and close the dialog on success. Existing bulk-enable, clear, provider-toggle, and scope-order actions SHALL remain reachable through their effective model-scope bindings. Escape SHALL close silently while retaining session-only scope changes and SHALL NOT persist those changes implicitly.

The dialog SHALL compare its current scope and order with the last successfully saved scope. Whenever they differ, the title row SHALL read `Models (unsaved)`, with `(unsaved)` immediately after the title. Ctrl+S SHALL persist the current scope and order while leaving the dialog open; only a successful save SHALL clear `(unsaved)`. An empty explicit scope SHALL preserve the existing all-model cycling fallback.

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
- **THEN** its filled or empty scope marker SHALL precede the model identifier
- **AND** its active-model checkmark, when present, SHALL appear immediately after its `[provider]` badge

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
- **THEN** the active model and persisted default SHALL change through the existing model-selection policy
- **AND** the dialog SHALL close and the existing model confirmation SHALL be presented
- **AND** pending unsaved scope changes SHALL remain session-only rather than being saved as a side effect

#### Scenario: Cancel with pending scope changes
- **WHEN** the user presses Escape while the title shows `(unsaved)`
- **THEN** the dialog SHALL close silently and restore the ordinary input surface
- **AND** the changed scope SHALL remain effective for the current session but SHALL not be written to settings

#### Scenario: Refresh model catalogs
- **WHEN** catalog refresh succeeds, fails, or times out while the Models dialog is open
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state
- **AND** it SHALL update the available rows and report the bounded refresh outcome without broadening availability to unauthenticated providers

#### Scenario: Invoke an explicit model-selection binding
- **WHEN** the user invokes an explicitly configured model-selection shortcut in bare A1
- **THEN** the same unified Models dialog SHALL open
- **AND** scope management and model selection SHALL have the same behavior as invocation through `/models`

### Requirement: Collapsed skills are reached through one skills command
Bare A1 SHALL declare the collapsed skill presentation as a replacement for the pinned per-skill command listing, governed by the A1 setting `skillsPresentation`. While the value is `collapse` and the engine registers skills as commands, the top-level slash-command menu SHALL omit every `skill:<name>` entry and SHALL offer one `skills` command described `Browse, search, and apply a skill`, matched by the same prefix rules as every other command, whose argument completions are the skill names. Invoking `/skills` with no arguments SHALL open the Skills dialog. Invoking `/skills <name> [args]`, where `<name>` matches a discovered skill with or without a `skill:` prefix, SHALL apply that skill with the remaining text as arguments without opening the dialog. Invoking `/skills <name>` with a name that matches no skill SHALL report `Unknown skill: <name>` as a command outcome, as other commands report an unknown argument, and SHALL NOT open the dialog. Argument completion after `/skills ` SHALL list the skill names matching the typed prefix and SHALL show no menu when none matches, exactly as other commands' argument completion does.

Applying a skill SHALL submit `/skill:<name>` plus any arguments through the ordinary prompt path, so the engine performs its pinned skill expansion, queue behavior, transcript rendering, and history recording. A1 SHALL NOT rebuild the skill block itself. A typed `/skill:<name>` SHALL still reach the engine while collapsed; only its menu entry is withheld.

While the value is `expand`, or the engine does not register skills as commands, no `skills` command SHALL exist: `expand` SHALL present the pinned per-skill entries unchanged, and a disabled engine registration SHALL present no skill commands at all. Changing either setting SHALL refresh the menu in the running shell without `/reload` or restart. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain their pinned command catalog. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement the replacement.

#### Scenario: Open the menu while collapsed
- **WHEN** skills are discovered, the engine registers skill commands, `skillsPresentation` is `collapse`, and the user types `/`
- **THEN** the menu SHALL list `skills` with its description and no `skill:<name>` entry
- **AND** typing `/sk` SHALL narrow the menu to `skills` under the ordinary prefix rules

#### Scenario: Open the menu while expanded
- **WHEN** `skillsPresentation` is `expand` and the user types `/`
- **THEN** the menu SHALL list every `skill:<name>` entry exactly as pinned Pi does and SHALL NOT list `skills`

#### Scenario: Apply a named skill directly
- **WHEN** the user submits `/skills code-review fix the tests` or `/skills skill:code-review fix the tests` while collapsed
- **THEN** `/skill:code-review fix the tests` SHALL be submitted through the ordinary prompt path without opening the dialog
- **AND** the engine SHALL expand it exactly as a typed `/skill:code-review fix the tests`

#### Scenario: Name an unknown skill
- **WHEN** the user submits `/skills review` while collapsed and no skill is named `review`
- **THEN** A1 SHALL report `Unknown skill: review` as a command outcome and SHALL NOT open the dialog or submit a prompt

#### Scenario: Complete a skill name argument
- **WHEN** the user types `/skills fr` while collapsed
- **THEN** the argument menu SHALL list the skill names starting with `fr`
- **AND** typing `/skills zz` with no such skill SHALL show no menu

#### Scenario: Switch the setting live
- **WHEN** the user changes `Skills` between `collapse` and `expand` during a session
- **THEN** the next opened menu SHALL reflect the new presentation without `/reload`

#### Scenario: Engine registration is disabled
- **WHEN** the engine's skill-command registration is disabled while `skillsPresentation` is `collapse`
- **THEN** the menu SHALL list neither `skills` nor any `skill:<name>` entry

#### Scenario: Compare with pinned Pi
- **WHEN** equivalent input runs through `a1 pi` and untouched pinned Pi
- **THEN** their menus SHALL list the pinned per-skill entries and no `skills` command
- **AND** only bare A1's declared collapsed presentation SHALL be treated as an expected deviation

### Requirement: The Skills dialog browses, searches, and applies a skill
The Skills dialog SHALL be an A1-owned modal built on public component boundaries and presented as a regular selector dialog like the model selector: the same overlay placement, owned input coordination, pinned border, spacer, search-input, list, and footer composition, and the same keybinding-hint footer wording the pinned selectors use (`↑↓ navigate`, confirm `select`, cancel `cancel`). It SHALL preserve the existing modal contract for exposed transcript content. Its content SHALL be the accent bold title `Skills` above the search input, the matching skills as rows labeled `skill:<name>` in discovery-sorted name order with the selected row prefixed `→ ` in the accent role, the selected skill's one-line whitespace-collapsed description in the muted role below the rows, and the pinned `(selected/total)` scroll counter only when rows exceed the visible window. An empty filtered result SHALL render `No matching skills`; a session with no skills SHALL render `No skills yet`.

A row SHALL match a query when the query, ignoring case and an optional leading `skill:`, is a substring of the skill name or its description. Typing SHALL edit the query and reset the selection to the first row. Up and Down SHALL move the selection and wrap at either end. Enter SHALL apply the selected skill as the skills command defines, then close the dialog. Escape and the pinned cancel binding SHALL close the dialog and leave the editor text and history unchanged, exactly as cancelling the model selector does. The dialog SHALL open only from `/skills` with no arguments and SHALL never open with a seeded query. It SHALL NOT change the model, session, or settings.

#### Scenario: Browse skills
- **WHEN** the dialog opens with skills present
- **THEN** every skill SHALL be listed as `skill:<name>` with the first row selected and its description shown below the list
- **AND** the counter SHALL appear only when the rows overflow the visible window

#### Scenario: Search skills
- **WHEN** the user types `apply` in the dialog
- **THEN** only skills whose name or description contains `apply` SHALL remain, the first SHALL be selected, and its description SHALL be shown
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

### Requirement: The skills tunnel completes skills inside the command menu
While `skillsPresentation` is `collapse` and the engine registers skill commands, bare A1's default editor SHALL provide a `skills` command tunnel. When single-line editor content before the cursor is exactly `/skills:` followed by zero or more non-whitespace characters, the menu SHALL list every skill whose name or description contains the query, ignoring case and an optional leading `skill:` or `skills:`, as rows labeled `skills:<name>` with the skill's one-line description; the selected row SHALL keep its description in the muted role. When no skill matches, no menu SHALL be shown. Applying a tunnel row SHALL replace the search with `/skills:<name> ` and place the cursor after the space, as pinned slash-command application does.

When the command menu is open on a sole top-level slash search whose selected row is `skills` and the user types `:`, the editor SHALL replace the search with `/skills:`, push an undo snapshot, and reopen the menu with the tunnel rows. Every other `:` keystroke SHALL be inserted as ordinary text. A submitted `/skills:<name>` optionally followed by whitespace and further text SHALL be rewritten to `/skill:<name>` followed by the same text before it reaches the engine, and prompt history SHALL record the typed `/skills:` form. Existing extension autocomplete wrappers registered through the provider seam SHALL continue to compose over the tunnel-aware provider. While `expand` is active, in the `a1 pi` comparison profile, and in untouched pinned Pi, `/skills:` SHALL remain ordinary text with no tunnel behavior.

#### Scenario: List skills through the tunnel
- **WHEN** the user types `/skills:` while collapsed
- **THEN** the menu SHALL list every skill as `skills:<name>` with its description and the first row selected
- **AND** typing `/skills:fra` SHALL narrow the rows to skills whose name or description contains `fra`

#### Scenario: Complete the selected command with a colon
- **WHEN** the user types `/sk` so `skills` is the selected row and then types `:`
- **THEN** the editor text SHALL become `/skills:` with the cursor at its end and the tunnel rows open
- **AND** undo SHALL restore `/sk`

#### Scenario: Apply a tunnel row
- **WHEN** the user accepts the `skills:framer` row
- **THEN** the editor SHALL contain `/skills:framer ` with the cursor after the space

#### Scenario: Submit a tunneled skill
- **WHEN** the user submits `/skills:framer redesign the hero`
- **THEN** `/skill:framer redesign the hero` SHALL reach the engine through the ordinary prompt path
- **AND** history recall SHALL restore `/skills:framer redesign the hero`

#### Scenario: Type a colon elsewhere
- **WHEN** the user types `:` with no menu open, with a non-`skills` row selected, or after other text on the line
- **THEN** the colon SHALL be inserted as ordinary text

#### Scenario: Tunnel outside collapse
- **WHEN** `/skills:` is typed while `expand` is active or through the `a1 pi` comparison profile
- **THEN** no tunnel rows SHALL appear and the text SHALL be treated as pinned Pi treats it

### Requirement: The changelog and hotkeys commands open reference screens in bare A1
Bare A1 SHALL declare `/changelog` and `/hotkeys` as A1-owned replacements for the pinned in-feed changelog and keyboard-shortcut documents. The owned route host SHALL claim both routes ahead of the pinned workflow table, so invoking either in bare A1 opens the A1-owned reference screen full screen over the session and appends no document, status, checkmark, or error row to the feed. `/changelog` SHALL open the screen titled `What's New` with the complete pinned changelog Markdown in the same order and with the same link rewriting the pinned `/changelog` workflow produces. `/hotkeys` SHALL open the screen titled `Keyboard Shortcuts` with the bare-A1 keybinding-derived tables the in-feed presenter produced for the `a1` profile, including the current editor keybinding configuration and extension shortcut descriptions gathered when the screen opens. Bare A1 SHALL carry those tables as structured sections into the reference screen rather than recognizing labels from rendered text. Every section SHALL use the same shared header component, bold yellow Markdown-heading role, one-cell left inset, content adjacency, inter-section spacing, and active-section pinning as owned Settings. One blank row SHALL separate the main screen title from the first section. The changelog document SHALL retain its flat settings-aware Markdown presentation, and the hotkeys refinement SHALL NOT alter table content, wrapping, section order, or the pinned comparison presentation. Both screens SHALL omit the spacer, border, and heading rows that were feed chrome.

The screen SHALL be presented through the same owned route path as `/settings`: full-size top-left overlay with owned input coordination, pointer reporting enabled for its lifetime and disabled when it closes, mouse reports routed to the screen before any other surface, and the interrupt chord watched on raw input. The commands SHALL remain listed in the slash-command menu with their pinned descriptions. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain the pinned in-feed documents; without the owned route host the commands remain pinned workflow routes. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement the replacement.

#### Scenario: Invoke the changelog command in bare A1
- **WHEN** the user submits `/changelog` in bare A1
- **THEN** the `What's New` reference screen SHALL open with the complete pinned changelog, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** pressing `Esc` SHALL close it and restore the session with its transcript position unchanged

#### Scenario: Invoke the hotkeys command in bare A1
- **WHEN** the user submits `/hotkeys` in bare A1
- **THEN** the `Keyboard Shortcuts` reference screen SHALL open with the bare-A1 Navigation, Editing, Other, Models dialog, and, when any exist, Extensions tables and the feed SHALL gain no rows
- **AND** each section label SHALL use the Settings bold yellow heading role, align with the main title's one-cell left inset, and begin after one blank row below that title
- **AND** each section table SHALL begin on the row immediately following its label with no blank spacer
- **AND** scrolling within a section SHALL pin that section label as the first document row until the next section takes over
- **AND** adding another structured section SHALL require only section data, not a label-specific styling or pinning branch
- **AND** a keybinding configuration reloaded before the next invocation SHALL be reflected the next time the screen opens

#### Scenario: Scroll and close a reference command screen
- **WHEN** the changelog or hotkeys screen is open above an overflowing document
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll the document as the reference screen specifies, no transcript scroll, selection, or control SHALL activate through the screen, and closing SHALL restore pointer reporting and the viewport as after `/settings`

#### Scenario: Invoke either command in the comparison profile
- **WHEN** the user submits `/changelog` or `/hotkeys` in `a1 pi`
- **THEN** the pinned workflow SHALL run and the pinned in-feed document with its spacer, borders, heading, Markdown, and chronological placement SHALL be appended exactly as before

### Requirement: Startup release notes open as a reference screen in bare A1
Bare A1 SHALL keep the pinned changelog startup lifecycle: the engine's new-entries-since-last-version reading, the `collapseChangelog` decision, the expanded or collapsed diagnostic, and the stored acknowledged version SHALL be unchanged. In the custom viewport, both the expanded and the collapsed diagnostic SHALL render as the compact two-line hint (`What's New` and `Run /changelog to view the full release notes.`) at the pinned position after the transcript rows, and the full document SHALL NOT be rendered in the feed. When the expanded diagnostic first arrives and the runtime is active, the owned route host exists, and no dialog, selector, or owned route is presented, the shell SHALL open the `What's New` reference screen once with exactly the new entries the diagnostic carries. When a modal is presented at that moment, the screen SHALL NOT be opened later for that launch; the hint remains and `/changelog` shows the complete changelog. The pinned layout SHALL keep rendering the expanded document in the feed and SHALL open no screen.

#### Scenario: Start bare A1 after an upgrade with the changelog expanded
- **WHEN** bare A1 starts an empty session, the stored last changelog version is older than the pinned version, and `collapseChangelog` is off
- **THEN** the feed SHALL show the two-line hint, the `What's New` screen SHALL open once with only the entries newer than the stored version, and the stored version SHALL advance as pinned Pi specifies
- **AND** closing the screen SHALL leave the hint in the feed and the editor focused

#### Scenario: Start bare A1 with the changelog collapsed
- **WHEN** the same launch has `collapseChangelog` on
- **THEN** only the two-line hint SHALL be shown and no screen SHALL open

#### Scenario: A modal is already presented
- **WHEN** the expanded diagnostic arrives while a dialog, selector, or owned route is presented
- **THEN** no screen SHALL open for that launch, the hint SHALL remain, and `/changelog` SHALL still open the complete changelog on request

#### Scenario: Start the comparison profile after an upgrade
- **WHEN** `a1 pi` starts under the same conditions
- **THEN** the pinned expanded or collapsed transcript block SHALL be rendered in the feed exactly as before and no screen SHALL open

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Each level SHALL render its description inline in semantic muted grey regardless of cursor selection, with every description aligned to the same column one separator after the widest rendered level-name and marker region. The active session level SHALL have exactly one semantic success-green checkmark immediately after its level name. The configured default level SHALL render the literal `[default]` marker in semantic muted grey within the primary label region immediately after that optional active checkmark and before the aligned description; when active and default differ, each marker SHALL remain on the row for its own state. While the selector is open, the footer SHALL omit its thinking-level suffix so the active level is not duplicated below the selector, then restore that suffix when the selector closes. The presentation change SHALL preserve the selector's borders, search input, navigation, selection, default persistence, cancellation, focus, and restoration behavior.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis
- **AND** the resolved cycle hint SHALL use semantic muted grey on the row directly below the heading

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** repeated available-level values SHALL render exactly once
- **AND** each description SHALL use semantic muted grey and begin in the same aligned column
- **AND** only the active session level SHALL place one semantic success-green checkmark immediately after its name
- **AND** the configured default level SHALL place a semantic muted-grey `[default]` after its optional active checkmark and before its description
- **AND** a level that is both active and configured as default SHALL render its primary state as `<level> ✓ [default]`
- **AND** differing active and configured-default levels SHALL display only their respective markers
- **AND** the footer SHALL omit its thinking-level suffix until the selector closes
- **AND** closing the selector SHALL restore the footer's current thinking-level suffix

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, saves a default level, or cancels the selector
- **THEN** the selector SHALL retain its existing interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, focus, or instruction placement

### Requirement: Bare A1 keeps model and thinking commands adjacent
Bare A1 SHALL present `thinking` immediately after its unified `models` command in the advertised workflow catalog and slash-command autocomplete. All other owned built-in commands SHALL retain their relative order. The pinned `a1 pi` comparison profile SHALL retain its upstream command order unchanged.

#### Scenario: Open bare A1 slash-command autocomplete
- **WHEN** bare A1 presents its built-in slash-command catalog
- **THEN** its first four commands SHALL be `settings`, `models`, `thinking`, and `tree` in that order
- **AND** its advertised workflow catalog SHALL use the same order

#### Scenario: Open comparison slash-command autocomplete
- **WHEN** the `a1 pi` comparison profile presents its built-in slash-command catalog
- **THEN** `model`, `tree`, `thinking`, and `scoped-models` SHALL remain in pinned upstream order

### Requirement: Bare A1 links the current branch's open pull request from the footer

Bare A1 SHALL discover the open GitHub pull request associated with the effective working tree branch and, when one is available, SHALL render `PR #<number>` directly after the footer's path and branch. The `PR` prefix SHALL retain the footer's grey, while only `#<number>` SHALL use the established web-link color and carry the pull request's canonical HTTPS URL as a terminal-native hyperlink so the terminal provides its ordinary hover and Ctrl+click behavior. The path, branch, `PR` prefix, separator, and session name SHALL remain outside the hyperlink.

Discovery SHALL be asynchronous, bounded, serialized, and optional. Missing GitHub CLI or authentication, detached or mismatched branches, no open pull request, malformed or unsafe output, command failure, and timeout SHALL leave the existing footer unchanged and SHALL NOT block startup or fail the session. A running session SHALL refresh the association at a bounded cadence and SHALL release its timer and active probe on disposal.

The badge is a declared bare-A1 addition. The `a1 pi` comparison profile SHALL retain its pinned footer bytes and SHALL NOT render the badge.

#### Scenario: Show an open branch pull request

- **WHEN** bare A1 runs in a Git working tree whose current branch has an open pull request numbered 567 at `https://github.com/example/project/pull/567`
- **THEN** the footer path row SHALL contain `path (branch) PR #567`
- **AND** `PR` SHALL retain the same grey role as the surrounding footer
- **AND** only `#567` SHALL be an OSC 8 hyperlink targeting that canonical URL
- **AND** the linked number SHALL use the same theme role as established web links

#### Scenario: Keep surrounding footer text outside the link

- **WHEN** the footer also has a session name
- **THEN** the row SHALL order path, branch, PR badge, and session name as `path (branch) PR #<number> • session-name`
- **AND** the path, branch, spaces, `PR` prefix, separator, and session name SHALL NOT resolve to the PR target

#### Scenario: No open pull request is available

- **WHEN** the current directory is not a Git repository, the head is detached, no open PR matches the current branch, or GitHub CLI discovery fails, times out, or returns invalid data
- **THEN** the footer SHALL retain its existing path, branch, and session-name presentation without a PR badge
- **AND** startup and the running agent session SHALL continue without a PR-discovery diagnostic

#### Scenario: Pull request association changes during the session

- **WHEN** a bounded refresh observes that the current branch gains, loses, or changes its open pull request association
- **THEN** the footer SHALL update to the newest normalized identity
- **AND** unchanged refreshes SHALL NOT cause redundant view updates
- **AND** no two discovery processes SHALL overlap

#### Scenario: Dispose while discovery is pending

- **WHEN** the session is disposed with a refresh timer or PR discovery process pending
- **THEN** the timer and process SHALL be cancelled or released
- **AND** a late result SHALL NOT update or render the disposed session

#### Scenario: Render a narrow footer

- **WHEN** the linked PR badge reaches the footer's truncation boundary
- **THEN** the rendered row SHALL remain within its declared width
- **AND** hyperlink and foreground state SHALL close at the truncation boundary without extending to another cell or row

#### Scenario: Use the pinned comparison profile

- **WHEN** the same footer state is rendered through `a1 pi`
- **THEN** its output SHALL match the pinned footer without a PR badge or PR hyperlink
