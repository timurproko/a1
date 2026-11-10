## MODIFIED Requirements

### Requirement: Bare A1 assigns Ctrl+L only to agent level cycling by default

In bare A1's default agent-input keybindings, Ctrl+L SHALL invoke the existing thinking-level cycle action exactly once and SHALL NOT open model selection. Shift+Tab SHALL be unassigned, SHALL perform no action in the agent input, and SHALL NOT insert text, change focus, select a model, cycle a level, or acquire a replacement action. Model selection SHALL default to Ctrl+M, SHALL open the unified Models dialog, and SHALL remain reachable through `/models`.

These defaults SHALL be declared in the A1 profile's keybinding data and SHALL preserve the existing engine-supported level order and model clamping behavior. Explicit user keybinding configuration SHALL retain its existing override and conflict-reporting semantics without being rewritten. An effective model-selection binding SHALL open the unified Models dialog. Unrelated modal scopes and the pinned comparison profile SHALL retain their own declarations. Ctrl+M handling SHALL distinguish supported modified-key input from ordinary Enter and SHALL NOT consume ordinary carriage-return submission or selection as model selection; an indistinguishable legacy encoding SHALL retain Enter behavior.

#### Scenario: Press Ctrl+L in the agent input

- **WHEN** the default bare-A1 agent input receives Ctrl+L in a supported terminal encoding
- **THEN** the existing level-cycle action SHALL run exactly once
- **AND** no Models dialog SHALL open and no characters SHALL be inserted into the draft

#### Scenario: Leave Shift+Tab reserved for later

- **WHEN** the default bare-A1 agent input receives Shift+Tab, including with suggestions visible or a nonempty draft
- **THEN** no action SHALL run, the focus and draft SHALL remain unchanged, and the level SHALL NOT change

#### Scenario: Open model selection by command

- **WHEN** the user invokes distinguishable Ctrl+M or `/models` in bare A1's agent input
- **THEN** the unified Models dialog SHALL open
- **AND** ordinary Enter SHALL retain prompt submission and modal acceptance behavior

#### Scenario: Preserve ordinary Enter in a legacy terminal

- **WHEN** the terminal cannot distinguish Ctrl+M from ordinary carriage return
- **THEN** that input SHALL retain Enter behavior and `/models` SHALL remain available

#### Scenario: Keep dialog-local bindings isolated

- **WHEN** Ctrl+L is handled by an unrelated modal's declared local binding
- **THEN** that modal behavior SHALL remain intact and the agent's thinking-level action SHALL NOT also fire

#### Scenario: Preserve explicit customization

- **WHEN** a user has explicitly configured an override for level cycling or model selection
- **THEN** the existing configuration-resolution and conflict-reporting rules SHALL apply without this default change rewriting the user's file
- **AND** an effective model-selection binding SHALL open the unified Models dialog

### Requirement: Agent shortcut help reflects the new unassigned actions

Bare A1's startup help and shortcut listings SHALL derive level-cycle, Apps, and model-selection key labels from the active declarations. With defaults, they SHALL advertise Ctrl+L for level cycling, Ctrl+P for Apps, and Ctrl+M for model selection, and SHALL NOT advertise Shift+Tab as performing an agent-input action or Ctrl+P as cycling models. The model-selection fallback SHALL remain `/models`, including when legacy terminal encoding cannot distinguish Ctrl+M from Enter. Pinned comparison help SHALL remain consistent with its unchanged defaults.

#### Scenario: Show bare-A1 help

- **WHEN** startup help or the shortcut listing is shown with default A1 bindings
- **THEN** Ctrl+L SHALL be identified as cycle thinking level, Ctrl+P as Apps, and Ctrl+M as Models
- **AND** Shift+Tab SHALL have no advertised agent-input action and Ctrl+P SHALL NOT be advertised as model cycling
- **AND** the model-selection fallback SHALL name `/models`

#### Scenario: Show customized help

- **WHEN** explicit user keybindings change an action's resolved keys
- **THEN** help SHALL show the resolved declarations instead of hardcoded default labels

## ADDED Requirements

### Requirement: Apps owns Ctrl+P across the owned application surfaces by default

Bare A1 SHALL declare Ctrl+P as the default Apps action and SHALL make the effective action available while Agent, Settings, or Changelog is active. The default model-cycle-forward declaration SHALL no longer claim Ctrl+P; no replacement cycling key SHALL be invented by this change. Existing explicit overrides and conflict diagnostics SHALL remain authoritative and SHALL NOT be silently rewritten. Unrelated dialog-local Ctrl+P actions and comparison-profile declarations SHALL retain their behavior outside the Apps action's scope.

#### Scenario: Open Apps from any supported application

- **WHEN** Agent, Settings, or Changelog receives its effective Apps shortcut
- **THEN** the searchable Apps dialog SHALL open over the current application
- **AND** no model-cycle action SHALL also run

#### Scenario: Preserve an explicit binding

- **WHEN** a user explicitly overrides Apps or model cycling
- **THEN** dispatch and help SHALL follow effective declarations and existing conflict-reporting rules without rewriting the configuration

#### Scenario: Preserve comparison defaults

- **WHEN** the comparison profile resolves or dispatches its model shortcuts
- **THEN** the bare-A1 Apps and Models defaults SHALL NOT change its behavior
