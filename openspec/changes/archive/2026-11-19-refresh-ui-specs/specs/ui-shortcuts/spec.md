## ADDED Requirements

### Requirement: Bare A1 default agent-input bindings cycle levels with Ctrl+L and models with Ctrl+M

In bare A1's default agent-input keybindings, Ctrl+L SHALL invoke the existing thinking-level cycle action exactly once and SHALL NOT open model selection. Shift+Tab SHALL be unassigned, SHALL perform no action in the agent input, and SHALL NOT insert text, change focus, select a model, cycle a level, or acquire a replacement action. Ctrl+M SHALL invoke the existing forward model-cycle action exactly once without opening a selector. Model selection SHALL have no default shortcut and SHALL remain reachable through `/models` and an explicitly configured effective model-selection binding.

These defaults SHALL be declared in the A1 profile's keybinding data and SHALL preserve the existing engine-supported level order, model-cycle ordering, scope, and model clamping behavior. Explicit user keybinding configuration SHALL retain its existing override and conflict-reporting semantics without being rewritten. An effective model-selection binding SHALL open the unified Models selector in place in the input dock. Unrelated modal scopes and the pinned comparison profile SHALL retain their own declarations. Ctrl+M handling SHALL distinguish supported modified-key input from ordinary Enter and SHALL NOT consume ordinary carriage-return submission or selection as model cycling; an indistinguishable legacy encoding SHALL retain Enter behavior.

#### Scenario: Press Ctrl+L in the agent input

- **WHEN** the default bare-A1 agent input receives Ctrl+L in a supported terminal encoding
- **THEN** the existing level-cycle action SHALL run exactly once
- **AND** no Models selector SHALL open and no characters SHALL be inserted into the draft

#### Scenario: Shift+Tab is unassigned

- **WHEN** the default bare-A1 agent input receives Shift+Tab, including with suggestions visible or a nonempty draft
- **THEN** no action SHALL run, the focus and draft SHALL remain unchanged, and the level SHALL NOT change

#### Scenario: Cycle directly with Ctrl+M

- **WHEN** the default bare-A1 agent input receives distinguishable Ctrl+M
- **THEN** the existing forward model-cycle action SHALL run exactly once
- **AND** no model selector or floating modal SHALL open and the draft SHALL remain unchanged
- **AND** the existing cycle workflow SHALL use all available models when the session scope is empty, or only available scoped models in scope order when it is nonempty

#### Scenario: Cycle with no scope

- **WHEN** Ctrl+M cycles with an empty session scope
- **THEN** it SHALL advance through all available models with existing wraparound behavior

#### Scenario: Cycle within scope

- **WHEN** Ctrl+M cycles with a nonempty session scope
- **THEN** it SHALL advance only through available scoped models in scope order with existing wraparound behavior
- **AND** it SHALL NOT select an available model outside that scope

#### Scenario: Clear the scope

- **WHEN** the session scope is cleared and Ctrl+M cycles again
- **THEN** it SHALL use all available models rather than retain the previous restricted pool

#### Scenario: Keep a small eligible pool unchanged

- **WHEN** the effective cycling pool contains at most one eligible model
- **THEN** the existing no-op behavior SHALL remain intact
- **AND** a nonempty scope SHALL NOT fall back to selecting an out-of-scope model

#### Scenario: Open model selection by command

- **WHEN** the user invokes `/models` in bare A1's agent input
- **THEN** the unified Models selector SHALL open in place in the input dock
- **AND** ordinary Enter SHALL retain prompt submission and selector acceptance behavior

#### Scenario: Preserve ordinary Enter in a legacy terminal

- **WHEN** the terminal cannot distinguish Ctrl+M from ordinary carriage return
- **THEN** that input SHALL retain Enter behavior and SHALL NOT cycle models
- **AND** `/models` SHALL remain available

#### Scenario: Keep dialog-local bindings isolated

- **WHEN** Ctrl+L is handled by an unrelated modal's declared local binding
- **THEN** that modal behavior SHALL remain intact and the agent's thinking-level action SHALL NOT also fire

#### Scenario: Preserve explicit customization

- **WHEN** a user has explicitly configured an override for level cycling, model cycling, or model selection
- **THEN** the existing configuration-resolution and conflict-reporting rules SHALL apply without the defaults rewriting the user's file
- **AND** an effective model-selection binding SHALL open the unified Models selector in place

### Requirement: Agent shortcut help derives key labels from the active declarations

Bare A1's startup help and shortcut listings SHALL derive level-cycle, Launcher, model-cycle, and model-selection key labels from the active declarations. With defaults, they SHALL advertise Ctrl+L for level cycling, Ctrl+P for Launcher, Ctrl+M for cycling to the next model, and `/models` for opening model selection without a default selection chord. They SHALL NOT advertise Shift+Tab as performing an agent-input action, Ctrl+P as cycling models, or Ctrl+M as opening a selector. Legacy-terminal guidance SHALL explain that indistinguishable Ctrl+M retains Enter behavior. Pinned comparison help SHALL remain consistent with the comparison profile's own defaults.

#### Scenario: Show bare-A1 help

- **WHEN** startup help or the shortcut listing is shown with default A1 bindings
- **THEN** Ctrl+L SHALL be identified as cycle thinking level, Ctrl+P as Launcher, and Ctrl+M as cycle to next model
- **AND** Shift+Tab SHALL have no advertised agent-input action and Ctrl+P SHALL NOT be advertised as model cycling
- **AND** model selection SHALL name `/models` rather than Ctrl+M

#### Scenario: Show customized help

- **WHEN** explicit user keybindings change an action's resolved keys
- **THEN** help SHALL show the resolved declarations instead of hardcoded default labels

## MODIFIED Requirements

### Requirement: Settings undo dispatch and guidance share one declaration

The owned Settings surface SHALL declare `Ctrl+Z` as its undo action in every ordinary Settings scope that can change or continue presenting a setting value. The list, scalar value menu, active search state, and generic structured-part dialog SHALL dispatch the chord to the same screen-local Settings undo behavior. The active Settings shortcut declarations SHALL supply the concise `Ctrl+Z undo` footer guidance and shortcut listing entry; no separate hardcoded hint SHALL advertise the action. Every visible owned Settings hint SHALL use a concise `<shortcut> <action>` label without the connective word `to`, including `Type search`, `↑↓ navigate`, `Enter change`, `Ctrl+Z undo`, and `Esc close`. Space SHALL NOT be declared as a Settings change action. This grammar and the shared dim-key/muted-action roles SHALL be enforced centrally at owned shortcut declaration and rendering boundaries so every owned dialog inherits the rule without per-dialog consistency assertions. Pinned Pi surfaces MAY retain upstream wording through their separate adapter. A specialized stepped selector that replaces ordinary setting editing, including per-model thinking configuration, SHALL instead advertise and dispatch only its step-specific keyboard actions while it is open. The chord SHALL remain local to Settings and SHALL NOT change editor undo or pinned comparison-profile bindings.

#### Scenario: Undo from the settings list

- **WHEN** the Settings list has focus and the user presses `Ctrl+Z`
- **THEN** the declared Settings undo action SHALL run

#### Scenario: Undo while a value menu is open

- **WHEN** a scalar value menu is open and the user presses `Ctrl+Z`
- **THEN** the menu SHALL close and the declared Settings undo action SHALL run
- **AND** the menu SHALL NOT consume the chord as an unrelated navigation key

#### Scenario: Undo while search is active

- **WHEN** Settings search is active and the user presses `Ctrl+Z`
- **THEN** the declared Settings undo action SHALL run while preserving the active query

#### Scenario: Undo from a generic structured-setting dialog

- **WHEN** a generic structured-part dialog is open and the user presses `Ctrl+Z`
- **THEN** the dialog's declared Settings undo action SHALL run

#### Scenario: Show Settings undo guidance

- **WHEN** the Settings footer or generic structured-part footer presents its active shortcut hints
- **THEN** it SHALL include `Ctrl+Z undo`
- **AND** all visible hints SHALL use concise shortcut/action labels without the connective word `to`
- **AND** the same declaration SHALL identify `Ctrl+Z` as Settings undo in shortcut listings

#### Scenario: Advertise only Enter for Settings changes

- **WHEN** the Settings list or generic structured dialog presents its change hint
- **THEN** it SHALL show `Enter change`
- **AND** Space SHALL NOT change the setting or appear in that hint

#### Scenario: Reject an inconsistent owned-dialog hint centrally

- **WHEN** any owned dialog declares or renders a keyed shortcut action beginning with connective `to`
- **THEN** the shared shortcut-hint boundary SHALL reject that entry
- **AND** no dialog-specific wording test SHALL be required to enforce the common grammar

#### Scenario: Show stepped-selector guidance

- **WHEN** the per-model thinking selector is open
- **THEN** step 1 SHALL use `Type search`, `Enter select`, and `Esc close` because Escape closes the selector
- **AND** step 2 SHALL use `Esc back` because Escape returns to step 1
- **AND** neither step SHALL show the main Settings adjustment or undo hints as though those actions were active

#### Scenario: Keep undo scopes isolated

- **WHEN** `Ctrl+Z` is used outside the owned Settings surface
- **THEN** this Settings declaration SHALL NOT handle it or alter the effective undo binding of another surface

## REMOVED Requirements

### Requirement: Bare A1 assigns Ctrl+L only to agent level cycling by default
**Reason**: A scenario title described Shift+Tab as reserved for later and the text referred to "this default change".
**Migration**: Covered by "Bare A1 default agent-input bindings cycle levels with Ctrl+L and models with Ctrl+M" with the same behaviour.

### Requirement: Agent shortcut help reflects the new unassigned actions
**Reason**: The name described the behaviour as new.
**Migration**: Covered by "Agent shortcut help derives key labels from the active declarations".
