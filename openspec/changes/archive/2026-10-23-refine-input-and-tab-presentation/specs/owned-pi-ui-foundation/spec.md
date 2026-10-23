## MODIFIED Requirements

### Requirement: Bare A1 declares shared input and status-level presentation
Bare A1 SHALL use the shared input presentation and status-level color behavior as an explicit A1-owned customization over the pinned shell. The ordinary main user prompt SHALL render one blank cell before its `❯` marker, followed by the existing marker-to-content spacing. Auxiliary A1-owned Agent search and compact text-entry inputs SHALL use the same reusable rules, caret, placeholder, and content geometry without rendering a chevron or greater-than prompt marker. This customization SHALL supersede pinned editor border coloring and thinking-label styling only in bare A1; it SHALL render shared input rules through the same active semantic `border` role as modal bars and SHALL NOT change pinned `a1 pi` presentation, extension-provided custom editors, engine semantics, or other footer values. Bare-A1 keyboard defaults SHALL follow the declared level-cycle and model-selector shortcut policy instead of pinned defaults.

#### Scenario: Open the pinned comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** editor thinking-level and bash-mode border colors, footer presentation, Shift+Tab level cycling, Ctrl+L model selection, and input prefixes SHALL retain pinned behavior

#### Scenario: Use the owned agent input
- **WHEN** the user starts bare A1 with its default agent editor
- **THEN** the input SHALL use the shared modal-border rules and render exactly one blank cell before the `❯` prompt marker
- **AND** prompt history, paste chips, selection and copy, suggestions, streaming, submission, and bash execution SHALL retain their existing semantics

#### Scenario: Use an auxiliary Agent input
- **WHEN** an A1-owned Agent selector, search, or compact text-entry surface requests the shared input presentation
- **THEN** the input SHALL render its caret, placeholder, and text without a chevron or greater-than prompt marker
- **AND** its existing focus, editing, submission, and cancellation behavior SHALL remain unchanged

#### Scenario: Change the owned accent live
- **WHEN** the active bare-A1 accent changes while the default agent editor is visible
- **THEN** both input rules SHALL repaint with the same derived border tone as modal rules
- **AND** the input SHALL retain its text, cursor, selection, focus, prefix choice, and geometry
