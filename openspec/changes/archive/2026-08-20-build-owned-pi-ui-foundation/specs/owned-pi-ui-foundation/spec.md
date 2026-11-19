## Purpose

Defines A1's independently owned Pi shell with vanilla-default regular main-screen mode and optional fullscreen mode, complete pinned interactive baseline including extension UI, exact current-version parity, public engine/runtime boundaries, customization slots, diagnostics, and upgrade-conformance policy.

## ADDED Requirements

### Requirement: The owned shell presents the complete pinned Pi interactive UI
The A1-owned UI SHALL reproduce the complete visible and interactive behavior of pinned Pi `0.84.2` at commit `914cf1472e715297caa30db4b9535d534a9eb718`. The baseline SHALL include startup composition, themes, colors, spacing, layout, editor, autocomplete, keybindings, commands, prompt execution, transcript, streaming, tools, selectors, dialogs, settings, sessions, models, thinking, status/footer state, clipboard, resize, errors, and shutdown. A1 SHALL NOT substitute approximate layouts, colors, controllers, or workflows for covered pinned behavior.

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
- **WHEN** the user invokes `/settings`
- **THEN** the owned UI SHALL present the pinned specialized settings selector with current values, descriptions, search, instructions, nested flows, navigation, cancellation, change callbacks, focus restoration, and resize behavior, and SHALL NOT expose internal callback names as settings values

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
- **WHEN** the user starts A1 without explicitly selecting fullscreen mode
- **THEN** the runtime SHALL use public `TuiMainScreen` in `regular` mode exactly as default vanilla Pi does
- **AND** it SHALL NOT enter the alternate screen, enable mouse tracking, intercept drag/release events, rewrite selected ANSI cells, synthesize clipboard output, or maintain screen-coordinate selection state

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
- **WHEN** a coherent pinned-UI correction is ready to be marked complete or committed
- **THEN** `npm run test:pi-terminal-parity` SHALL independently launch untouched pinned Pi and the A1-owned UI, apply equivalent deterministic terminal state and actions, compare all declared checkpoints, and pass before the correction is accepted

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
The owned UI SHALL use documented public Pi engine and terminal contracts through A1-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout A1 workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries.

#### Scenario: Pinned private interactive code is installed
- **WHEN** the Pi package contains stock interactive classes or private renderer state
- **THEN** A1 SHALL operate without constructing, patching, or inspecting those internals

#### Scenario: Exact behavior requires a coupled source unit
- **WHEN** covered behavior cannot be reused through a documented public contract
- **THEN** A1 SHALL port the minimum coherent source unit with provenance and an A1-owned boundary rather than deep-importing or patching it

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
