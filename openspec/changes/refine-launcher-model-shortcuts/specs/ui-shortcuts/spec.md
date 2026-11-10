## MODIFIED Requirements

### Requirement: Bare A1 assigns Ctrl+L only to agent level cycling by default

In bare A1's default agent-input keybindings, Ctrl+L SHALL invoke the existing thinking-level cycle action exactly once and SHALL NOT open model selection. Shift+Tab SHALL be unassigned, SHALL perform no action in the agent input, and SHALL NOT insert text, change focus, select a model, cycle a level, or acquire a replacement action. Ctrl+M SHALL invoke the existing forward model-cycle action exactly once without opening a selector. Model selection SHALL have no default shortcut and SHALL remain reachable through `/models` and an explicitly configured effective model-selection binding.

These defaults SHALL be declared in the A1 profile's keybinding data and SHALL preserve the existing engine-supported level order, model-cycle ordering, scope, and model clamping behavior. Explicit user keybinding configuration SHALL retain its existing override and conflict-reporting semantics without being rewritten. An effective model-selection binding SHALL open the unified Models selector in place in the input dock. Unrelated modal scopes and the pinned comparison profile SHALL retain their own declarations. Ctrl+M handling SHALL distinguish supported modified-key input from ordinary Enter and SHALL NOT consume ordinary carriage-return submission or selection as model cycling; an indistinguishable legacy encoding SHALL retain Enter behavior.

#### Scenario: Press Ctrl+L in the agent input

- **WHEN** the default bare-A1 agent input receives Ctrl+L in a supported terminal encoding
- **THEN** the existing level-cycle action SHALL run exactly once
- **AND** no Models selector SHALL open and no characters SHALL be inserted into the draft

#### Scenario: Leave Shift+Tab reserved for later

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
- **THEN** the existing configuration-resolution and conflict-reporting rules SHALL apply without this default change rewriting the user's file
- **AND** an effective model-selection binding SHALL open the unified Models selector in place

### Requirement: Agent shortcut help reflects the new unassigned actions

Bare A1's startup help and shortcut listings SHALL derive level-cycle, Launcher, model-cycle, and model-selection key labels from the active declarations. With defaults, they SHALL advertise Ctrl+L for level cycling, Ctrl+P for Launcher, Ctrl+M for cycling to the next model, and `/models` for opening model selection without a default selection chord. They SHALL NOT advertise Shift+Tab as performing an agent-input action, Ctrl+P as cycling models, or Ctrl+M as opening a selector. Legacy-terminal guidance SHALL explain that indistinguishable Ctrl+M retains Enter behavior. Pinned comparison help SHALL remain consistent with its unchanged defaults.

#### Scenario: Show bare-A1 help

- **WHEN** startup help or the shortcut listing is shown with default A1 bindings
- **THEN** Ctrl+L SHALL be identified as cycle thinking level, Ctrl+P as Launcher, and Ctrl+M as cycle to next model
- **AND** Shift+Tab SHALL have no advertised agent-input action and Ctrl+P SHALL NOT be advertised as model cycling
- **AND** model selection SHALL name `/models` rather than Ctrl+M

#### Scenario: Show customized help

- **WHEN** explicit user keybindings change an action's resolved keys
- **THEN** help SHALL show the resolved declarations instead of hardcoded default labels

### Requirement: Apps owns Ctrl+P across the owned application surfaces by default

Bare A1 SHALL declare Ctrl+P as the default Launcher action and SHALL make the effective action available while Agent, Settings, or Changelog is active. The default model-cycle-forward declaration SHALL use Ctrl+M rather than Ctrl+P. Existing explicit overrides and conflict diagnostics SHALL remain authoritative and SHALL NOT be silently rewritten. Unrelated dialog-local Ctrl+P actions and comparison-profile declarations SHALL retain their behavior outside the Launcher action's scope. Stable internal action identifiers MAY retain their existing names.

#### Scenario: Open Apps from any supported application

- **WHEN** Agent, Settings, or Changelog receives its effective Launcher shortcut
- **THEN** the searchable Launcher dialog SHALL open over the current application
- **AND** no model-cycle action SHALL also run

#### Scenario: Preserve an explicit binding

- **WHEN** a user explicitly overrides Launcher or model cycling
- **THEN** dispatch and help SHALL follow effective declarations and existing conflict-reporting rules without rewriting the configuration

#### Scenario: Preserve comparison defaults

- **WHEN** the comparison profile resolves or dispatches its model shortcuts
- **THEN** the bare-A1 Launcher and Models defaults SHALL NOT change its behavior
