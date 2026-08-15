## Purpose

Defines AddOne's independently owned fullscreen Pi shell, complete pinned interactive baseline including extension UI, exact current-version parity, public engine/runtime boundaries, customization slots, diagnostics, and upgrade-conformance policy.

## ADDED Requirements

### Requirement: The owned shell presents the complete pinned Pi interactive UI
The AddOne-owned UI SHALL reproduce the complete visible and interactive behavior of pinned Pi `0.84.1` at commit `53fa77ccd8a279eb87e92294ef3687b03ff80112`. The baseline SHALL include startup composition, themes, colors, spacing, layout, editor, autocomplete, keybindings, commands, prompt execution, transcript, streaming, tools, selectors, dialogs, settings, sessions, models, thinking, status/footer state, clipboard, resize, errors, and shutdown. AddOne SHALL NOT substitute approximate layouts, colors, controllers, or workflows for covered pinned behavior.

#### Scenario: Start an owned Pi session
- **WHEN** the user starts the owned fullscreen UI in an equivalent terminal and session state
- **THEN** the visible component tree, content, theme, spacing, focus, and available interactions SHALL match pinned Pi for that state

#### Scenario: Submit an ordinary prompt
- **WHEN** the user submits a non-command prompt against a configured model
- **THEN** the prompt SHALL become visible, the agent SHALL execute, assistant and tool activity SHALL stream in order, failures SHALL be visible, and the turn SHALL settle exactly as in pinned Pi

#### Scenario: Encounter an unmapped pinned behavior
- **WHEN** a visible pinned interactive behavior has no AddOne implementation or an AddOne approximation behaves differently
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

### Requirement: Visible Pi extension UI is part of the 1:1 baseline
The owned UI SHALL support the visible behavior exposed by pinned Pi extensions, including widgets, custom editors and inputs, selectors, dialogs, notifications, status and footer contributions, custom message and tool renderers, terminal input hooks, working indicators, and lifecycle cleanup. Extension UI behavior SHALL cross AddOne-owned versioned boundaries and SHALL NOT require mutation of installed Pi code or private interactive state.

#### Scenario: Extension contributes a visible surface
- **WHEN** a compatible pinned Pi extension registers a supported visible contribution
- **THEN** the owned UI SHALL present and update that contribution with equivalent focus, input, rendering, cancellation, and cleanup behavior

#### Scenario: Extension surface fails
- **WHEN** one extension renderer, input handler, or lifecycle callback throws or returns malformed data
- **THEN** AddOne SHALL isolate the failure, restore the baseline editor and focus, report the error, and preserve the rest of the session

#### Scenario: Extension requests an unmapped visual capability
- **WHEN** a pinned visible extension capability is not yet bridged through an AddOne-owned boundary
- **THEN** the parity gate SHALL fail rather than silently omitting the surface or reporting complete extension support

### Requirement: The pinned Pi version has exact observable parity before product work
The first accepted presentation SHALL match pinned Pi for visible rows, ANSI styling, colors, spacing, wrapping, component order, focus, editor state, selectors, dialogs, status/footer state, command availability and outcomes, prompt effects, event transitions, terminal progress, resize, errors, extension surfaces, and lifecycle behavior. Evidence SHALL use independent pinned-Pi and AddOne producers. AddOne-only snapshots and synthetic-only sessions MAY serve as regression fixtures but SHALL NOT establish parity.

#### Scenario: Rendering differs
- **WHEN** equivalent pinned-Pi and AddOne states produce a different visible row, style, color, spacing, wrapping, selector, dialog, status, footer, or extension surface outside an approved terminal-only tolerance
- **THEN** the parity gate SHALL fail

#### Scenario: Workflow differs
- **WHEN** a command, keybinding, prompt, queue action, clipboard action, model/session/settings flow, extension interaction, or shutdown path has a different observable outcome
- **THEN** the parity gate SHALL fail

#### Scenario: Evidence has only one producer
- **WHEN** expected and actual results are both derived from AddOne implementation code or AddOne-authored synthetic state
- **THEN** the result SHALL be classified as regression evidence and SHALL NOT satisfy parity

### Requirement: Every pinned interactive behavior has traceable port coverage
The change SHALL maintain an exhaustive, machine-verifiable mapping from the pinned interactive source baseline to AddOne behavior, tests, provenance, local modifications, and approved deviations. Every copied or adapted MIT-licensed source unit SHALL retain required attribution. Deviations SHALL be limited to public engine/runtime boundaries, AddOne ownership contracts, platform terminal integration, and removal of private mutation or inspection.

#### Scenario: Source behavior is unmapped
- **WHEN** a pinned interactive module, controller path, component state, extension surface, or lifecycle branch lacks a recorded destination and acceptance case
- **THEN** source-port coverage SHALL fail

#### Scenario: Deviation is undocumented
- **WHEN** AddOne changes covered behavior without an approved reason, affected acceptance case, and upstream source reference
- **THEN** source-port coverage SHALL fail

#### Scenario: Upgrade the pinned Pi version
- **WHEN** AddOne evaluates a newer Pi package
- **THEN** the source mapping, public adapter conformance, independent parity evidence, and approved-deviation ledger SHALL be regenerated and reviewed before release

### Requirement: Public engine and terminal authority remain behind AddOne boundaries
The owned UI SHALL use documented public Pi engine and terminal contracts through AddOne-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout AddOne workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries.

#### Scenario: Pinned private interactive code is installed
- **WHEN** the Pi package contains stock interactive classes or private renderer state
- **THEN** AddOne SHALL operate without constructing, patching, or inspecting those internals

#### Scenario: Exact behavior requires a coupled source unit
- **WHEN** covered behavior cannot be reused through a documented public contract
- **THEN** AddOne SHALL port the minimum coherent source unit with provenance and an AddOne-owned boundary rather than deep-importing or patching it

### Requirement: Customization remains disabled above the 1:1 baseline until acceptance
AddOne-specific themes, components, commands, layouts, structured tabs, and multi-agent presentation SHALL remain disabled until the complete pinned built-in and extension UI baseline passes source coverage, independent parity, real-prompt integration, and fresh manual acceptance. After acceptance, customization SHALL resolve through versioned AddOne-owned slots without mutating the baseline implementation or installed Pi code.

#### Scenario: Request customization before parity
- **WHEN** an AddOne-specific visual or layout customization is requested before 1:1 acceptance
- **THEN** the capability SHALL remain unavailable

#### Scenario: Apply customization after parity
- **WHEN** the accepted baseline receives a supported AddOne customization
- **THEN** the customization SHALL resolve through an owned slot and preserve ordinary built-in and extension session behavior

### Requirement: Contradictory manual findings invalidate completion claims
A user-controlled finding that a covered prompt, command, visual state, extension surface, or lifecycle path is missing or divergent SHALL invalidate any task completion or evidence claim contradicted by that finding. The affected task SHALL be reopened, corrected, and revalidated before later acceptance or publication tasks proceed.

#### Scenario: Prompt submission produces no working turn
- **WHEN** manual testing shows that an ordinary prompt does not visibly execute and complete despite automated tests passing
- **THEN** prompt and event orchestration tasks SHALL be treated as incomplete and downstream parity evidence SHALL be rejected

#### Scenario: Layout or color differs
- **WHEN** manual comparison against `a1 pi` shows undocumented differences in layout, spacing, colors, or component composition
- **THEN** composition and visual parity tasks SHALL be reopened until independent captures prove equivalence
