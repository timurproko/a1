## ADDED Requirements

### Requirement: Unified Models uses the existing in-place input surface

Bare A1 SHALL present unified Models in the Agent input dock using its pre-Apps layout and styling, not a floating modal. Its controller SHALL remain deferred. `/models` and effective explicit selection bindings SHALL open it; default Ctrl+M SHALL only cycle models. The selector SHALL preserve its controls, prompt restoration, transcript interaction, and exact compact/resize frame dimensions.

#### Scenario: Open model selection in place

- **WHEN** bare A1 receives `/models` or an effective explicit model-selection binding
- **THEN** the unified Models selector SHALL replace the Agent input surface using the established in-place presentation
- **AND** no centered floating Models overlay or full-screen dimmed backdrop SHALL be introduced

#### Scenario: Restore the prompt

- **WHEN** the reader cancels Models or completes model selection
- **THEN** the selector SHALL close and the existing prompt draft, attachments, and ordinary input focus SHALL be restored

#### Scenario: Edit the cycling scope

- **WHEN** the reader searches, changes all/scoped filtering, toggles a model or provider, reorders the scope, or saves it
- **THEN** the in-place selector SHALL retain the existing unified Models semantics and effective keyboard actions

#### Scenario: Interact with the transcript

- **WHEN** the reader scrolls or selects and copies transcript text outside the in-place Models input surface
- **THEN** ordinary transcript interaction SHALL remain available without becoming selector input

#### Scenario: Resize the in-place selector

- **WHEN** the terminal is compact or resizes while Models is open
- **THEN** the in-place selector SHALL preserve requested frame dimensions and usable controls

## MODIFIED Requirements

### Requirement: A configure dialog edits a structured value in a centered modal

The component layer SHALL provide one configure-modal frame that presents a structured value's parts on a centered floating surface over the screen that opened it. The frame SHALL deterministically darken the complete backdrop, restore full intensity inside the modal, fill every modal cell with the declared panel background, use the established compact dialog width when space permits, and preserve the requested terminal row and column dimensions. Backdrop separation SHALL NOT depend only on terminal-specific SGR faint behavior. It SHALL compose ANSI-styled source rows without counting style bytes as visible width, leaking backdrop treatment into the panel, or clearing backdrop treatment after the panel.

The shared component theme boundary SHALL own a visibly raised floating-dialog surface palette and its truecolor and 256-color forms rather than requiring a consuming route or individual dialog to embed a background sequence. The floating panel SHALL be visibly distinct from the darkened backdrop in both modes, following the maintainer's raised Commands reference rather than the previous low-contrast RGB 38 surface. The renderer SHALL reset the background after its span, while selected rows continue to use the active semantic selection background. Launcher and owned floating selectors, including nested Settings model selectors, SHALL use this same contrast policy. Unified Models in the Agent input dock SHALL instead retain its established in-place presentation without a floating backdrop. Closing or replacing the modal SHALL restore the underlying application's ordinary rendering without retained dimming.

The modal SHALL show every part it offers with the one in hand marked, a description of that part, and the semantic shortcut guidance for changing it. The active row's selection background SHALL fill the modal's content width as it does in the reference Plus Menu while the modal's outer padding retains the panel background. It SHALL answer from the values it is editing rather than from the snapshot it was opened with, so a change it makes is visible in it and the next change steps from what is shown. Opening it SHALL clear any hover on the surface behind it, and while it is open it SHALL own the pointer according to the consuming screen's dialog policy. Compact terminal layouts SHALL reduce the visible choice window before removing the title, active control, or shortcut guidance.

#### Scenario: Open a configure modal

- **WHEN** a structured value opens its configure dialog
- **THEN** the complete source screen SHALL remain visible with deterministic darkened treatment behind a contrasting centered panel-background surface
- **AND** the modal title, description, active control, rows, and shortcut guidance SHALL render at normal intensity inside that surface

#### Scenario: Match the native dialog surface palette

- **WHEN** a centered configure modal renders in truecolor or 256-color mode
- **THEN** every non-selected panel cell SHALL use the shared contrasting surface background for that mode
- **AND** selected rows SHALL restore the panel background in their outer padding after the selection span ends
- **AND** the consuming route and dialog SHALL NOT declare their own panel RGB or ANSI index

#### Scenario: Share contrast across owned modal paths

- **WHEN** Launcher or a nested Default Model or per-model thinking selector over Settings is presented
- **THEN** the complete underlying surface SHALL be darkened and the active panel SHALL remain opaque and undimmed through the shared policy

#### Scenario: Restore the underlying application

- **WHEN** an owned floating modal is canceled, completed, or replaced
- **THEN** backdrop treatment SHALL NOT persist into the restored application or the newly opened destination

#### Scenario: Change a value in the modal

- **WHEN** a part is changed from inside the modal
- **THEN** the modal SHALL show the new value
- **AND** a further change SHALL step from the value shown

#### Scenario: Render a compact configure modal

- **WHEN** the available rows or columns are smaller than the preferred configure-modal geometry
- **THEN** the modal SHALL remain within the requested frame and retain its title, active control, selected choice, and shortcut guidance
- **AND** no ANSI style sequence or wide grapheme SHALL be split at an overlay boundary
