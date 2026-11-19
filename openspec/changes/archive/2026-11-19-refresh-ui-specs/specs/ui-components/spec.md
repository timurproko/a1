## MODIFIED Requirements

### Requirement: Modal frames place titles directly below their top rule

The component layer SHALL provide reusable modal-frame chrome whose title row immediately follows its top rule. A titled modal SHALL NOT render an empty row between that rule and the title, and an individual modal producer SHALL NOT recreate top-title spacing outside the shared frame boundary. The frame MAY retain separately declared spacing after the title and elsewhere in its body.

The same frame SHALL give every semantic content row a one-cell global left inset while rendering its top, bottom, and explicitly declared separator rules at full width. Titles, search/input components, selectable content, descriptions, status rows, and shortcut rows SHALL inherit that outer inset from the frame rather than independently encoding it. Existing row-authored spaces MAY express relative indentation inside the content area. Child components SHALL render against the reduced content width so clipping, wrapping, carets, and pointer geometry agree with the visible inset.

The frame SHALL keep title styling, relative body indentation, lower chrome, and vertical spacing as its producer declared them. Unframed or extension-owned custom surfaces SHALL NOT receive inferred semantic slots or have rendered rows rewritten heuristically.

#### Scenario: Render a titled modal frame

- **WHEN** a modal frame renders a top rule and a title
- **THEN** the title SHALL be the next rendered row after the rule
- **AND** there SHALL be no empty row between them

#### Scenario: Inset modal content

- **WHEN** a modal frame renders its title, input, list rows, descriptions, status, and shortcuts
- **THEN** each semantic content row SHALL begin within the frame's one-cell global left inset
- **AND** relative indentation authored inside those rows SHALL remain relative to that inset

#### Scenario: Keep rules full width

- **WHEN** a padded modal frame renders a top, bottom, or declared separator rule
- **THEN** that rule SHALL continue to occupy the frame width
- **AND** the content inset SHALL NOT shorten or shift it

#### Scenario: Preserve spacing below the title

- **WHEN** a modal declares separation between its title and body
- **THEN** that separation SHALL remain below the title
- **AND** removing the top-title gap and applying the global inset SHALL NOT compact body sections or shortcut chrome

#### Scenario: Render an untitled custom surface

- **WHEN** a modal-like surface has no A1-authored title or owns its own extension-provided geometry
- **THEN** the shared frame policy SHALL NOT infer a title or remove a row by inspecting rendered text

#### Scenario: Resize a compact modal

- **WHEN** a titled modal is rendered at a narrow width or after a terminal resize
- **THEN** top-rule/title adjacency and the one-cell global content inset SHALL remain in effect
- **AND** child content SHALL receive the reduced width so title styling, clipping, wrapping, caret placement, and pointer geometry remain coherent

### Requirement: A configure dialog edits a structured value in a centered modal

The component layer SHALL provide one configure-modal frame that presents a structured value's parts on a centered floating surface over the screen that opened it. The frame SHALL deterministically darken the complete backdrop, restore full intensity inside the modal, fill every modal cell with the declared panel background, use the established compact dialog width when space permits, and preserve the requested terminal row and column dimensions. Backdrop separation SHALL NOT depend only on terminal-specific SGR faint behavior. It SHALL compose ANSI-styled source rows without counting style bytes as visible width, leaking backdrop treatment into the panel, or clearing backdrop treatment after the panel.

The shared component theme boundary SHALL own a visibly raised floating-dialog surface palette and its truecolor and 256-color forms rather than requiring a consuming route or individual dialog to embed a background sequence. The floating panel SHALL be visibly distinct from the darkened backdrop in both modes. The renderer SHALL reset the background after its span, while selected rows continue to use the active semantic selection background. Launcher and owned floating selectors, including nested Settings model selectors, SHALL use this same contrast policy. Unified Models in the Agent input dock SHALL instead retain its established in-place presentation without a floating backdrop. Closing or replacing the modal SHALL restore the underlying application's ordinary rendering without retained dimming.

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

### Requirement: Unified Models uses the existing in-place input surface

Bare A1 SHALL present unified Models in the Agent input dock using an in-place layout, not a floating modal. Its controller SHALL remain deferred, and opening SHALL present the completed dialog atomically without loading or refresh-status text. `/models` and effective explicit selection bindings SHALL open it; default Ctrl+M SHALL only cycle models. The selector SHALL preserve its controls, prompt restoration, non-dismissing outside wheel scrolling, and exact compact/resize frame dimensions. Its mouse hover SHALL be independent of keyboard selection and follow the shared text-only foreground blend. Clicking model text or its provider SHALL select that model through the existing switch workflow; clicking its scope circle SHALL toggle only that model's session cycling scope; clicking `all` or `scoped` SHALL select that filter. An outside primary press SHALL cancel Models and consume its whole gesture before ordinary transcript selection can begin.

#### Scenario: Open model selection in place

- **WHEN** bare A1 receives `/models` or an effective explicit model-selection binding
- **THEN** the unified Models selector SHALL replace the Agent input surface using the established in-place presentation
- **AND** no centered floating Models overlay or full-screen dimmed backdrop SHALL be introduced

#### Scenario: Open without an intermediate status frame

- **WHEN** the deferred Models controller is preparing
- **THEN** the existing terminal frame SHALL remain visible until Models is ready
- **AND** no loading or refresh-status message SHALL flash before the completed selector
- **AND** early input and cancellation SHALL remain supported without hiding actual failures

#### Scenario: Restore the prompt

- **WHEN** the reader cancels Models or completes model selection
- **THEN** the selector SHALL close and the existing prompt draft, attachments, and ordinary input focus SHALL be restored

#### Scenario: Edit the cycling scope

- **WHEN** the reader searches, changes all/scoped filtering, toggles a model or provider, reorders the scope, or saves it
- **THEN** the in-place selector SHALL retain the existing unified Models semantics and effective keyboard actions

#### Scenario: Click a model without redirecting keyboard hover focus

- **WHEN** model A is keyboard-active and the user hovers model B
- **THEN** A SHALL remain the Enter target and B SHALL receive only the text-hover blend
- **WHEN** the user clicks B's model text or provider
- **THEN** the existing switch workflow SHALL target B and close on success

#### Scenario: Click a scope marker or filter

- **WHEN** the user clicks B's scope circle while A is keyboard-active
- **THEN** only B's session scope membership SHALL toggle without switching the active model or saving the scope
- **WHEN** the user clicks `all` or `scoped`
- **THEN** the matching filter SHALL become active through the existing filter semantics

#### Scenario: Interact with the transcript

- **WHEN** the reader sends wheel input outside the in-place Models input surface
- **THEN** ordinary transcript scrolling SHALL remain available without becoming selector input or dismissing Models

#### Scenario: Cancel before a transcript selection gesture

- **WHEN** the reader primary-presses outside the in-place Models input surface
- **THEN** Models SHALL cancel and restore the prompt
- **AND** that gesture SHALL NOT select transcript text or act on a footer control
- **AND** a later independent transcript-selection gesture SHALL work normally

#### Scenario: Resize the in-place selector

- **WHEN** the terminal is compact or resizes while Models is open
- **THEN** the in-place selector SHALL preserve requested frame dimensions and usable controls
- **AND** its mouse targets SHALL match only its currently painted controls and rows
