# ui-shortcuts Specification

## Purpose
Defines A1 keyboard shortcuts as declared data rather than scattered key comparisons, so dispatch,
conflict detection, and the shortcut listing all read one registry.

## Requirements

### Requirement: Shortcuts are declared, not hand-matched
Every A1-owned shortcut SHALL be declared with its key, the scope it applies to, a description, and
the action it invokes. Dispatch SHALL resolve a key through those declarations rather than through
inline key comparisons, so a binding cannot exist without being declared.

#### Scenario: Declare and dispatch a shortcut
- **WHEN** a declared shortcut's key arrives within its scope
- **THEN** its action SHALL be invoked

#### Scenario: Key outside its scope
- **WHEN** a declared shortcut's key arrives outside the scope it declares
- **THEN** its action SHALL NOT be invoked and the key SHALL continue to the surrounding handler

#### Scenario: Undeclared key
- **WHEN** a key matching no declaration arrives
- **THEN** it SHALL continue to the surrounding handler unchanged

### Requirement: Conflicting shortcuts are detected, not discovered
Two shortcuts declaring the same key in overlapping scopes SHALL be reported as a conflict when the
registry is assembled. A conflict SHALL name both declarations and the key. A1 SHALL NOT silently
resolve a conflict by declaration order.

#### Scenario: Two shortcuts claim one key in the same scope
- **WHEN** two declarations share a key and scope
- **THEN** assembling the registry SHALL report the conflict naming both and the key

#### Scenario: Same key in disjoint scopes
- **WHEN** two declarations share a key but their scopes do not overlap
- **THEN** both SHALL be accepted and each SHALL apply only within its own scope

#### Scenario: A screen shadows a global shortcut
- **WHEN** a screen declares a key that a global shortcut also declares
- **THEN** the shadowing SHALL be reported, and the screen's binding SHALL apply while that screen is
  presented

### Requirement: The registry is the source for what the user is shown
Any listing of available shortcuts SHALL be derived from the registry, so a listed shortcut is one
that dispatch would actually invoke and a working shortcut cannot be missing from the listing.

#### Scenario: List shortcuts
- **WHEN** the available shortcuts are listed
- **THEN** the listing SHALL contain every declared shortcut in scope with its key and description

#### Scenario: Add a shortcut
- **WHEN** a new shortcut is declared
- **THEN** it SHALL appear in the listing without any separate listing edit

#### Scenario: Listing and dispatch cannot diverge
- **WHEN** a listing entry names a key
- **THEN** dispatching that key in that scope SHALL invoke the action the listing describes

### Requirement: Bare A1 assigns Ctrl+L only to agent level cycling by default
In bare A1's default agent-input keybindings, Ctrl+L SHALL invoke the existing thinking-level cycle action exactly once and SHALL NOT open model selection. Shift+Tab SHALL be unassigned, SHALL perform no action in the agent input, and SHALL NOT insert text, change focus, select a model, cycle a level, or acquire a replacement action. Model selection SHALL have no default keyboard shortcut, including no reassignment to Shift+Tab, and SHALL remain reachable through `/model`.

These defaults SHALL be declared in the A1 profile's keybinding data and SHALL preserve the existing engine-supported level order and model clamping behavior. Explicit user keybinding configuration SHALL retain its existing override and conflict-reporting semantics without being rewritten. Unrelated modal scopes and the pinned comparison profile SHALL retain their own declarations.

#### Scenario: Press Ctrl+L in the agent input
- **WHEN** the default bare-A1 agent input receives Ctrl+L in a supported terminal encoding
- **THEN** the existing level-cycle action SHALL run exactly once
- **AND** no model selector SHALL open and no characters SHALL be inserted into the draft

#### Scenario: Leave Shift+Tab reserved for later
- **WHEN** the default bare-A1 agent input receives Shift+Tab, including with suggestions visible or a nonempty draft
- **THEN** no action SHALL run, the focus and draft SHALL remain unchanged, and the level SHALL NOT change

#### Scenario: Open model selection by command
- **WHEN** the user invokes `/model` in bare A1
- **THEN** the model selector SHALL remain available with its existing behavior despite having no default shortcut

#### Scenario: Keep dialog-local bindings isolated
- **WHEN** Ctrl+L is handled by an unrelated modal's declared local binding
- **THEN** that modal behavior SHALL remain intact and the agent's thinking-level action SHALL NOT also fire

#### Scenario: Preserve explicit customization
- **WHEN** a user has explicitly configured an override for level cycling or model selection
- **THEN** the existing configuration-resolution and conflict-reporting rules SHALL apply without this default change rewriting the user's file

### Requirement: Agent shortcut help reflects the new unassigned actions
Bare A1's startup help and shortcut listings SHALL derive level-cycle and model-selection key labels from the active declarations. With defaults, they SHALL advertise Ctrl+L for level cycling, SHALL NOT advertise a model-selection shortcut, and SHALL NOT advertise Shift+Tab as performing an action. The model-selection action SHALL remain discoverable as an unbound action or through its `/model` command. Pinned comparison help SHALL remain consistent with its unchanged defaults.

#### Scenario: Show bare-A1 help
- **WHEN** startup help or the shortcut listing is shown with default A1 bindings
- **THEN** Ctrl+L SHALL be identified as cycle thinking level
- **AND** model selection SHALL have no advertised key and Shift+Tab SHALL have no advertised agent-input action

#### Scenario: Show customized help
- **WHEN** explicit user keybindings change an action's resolved keys
- **THEN** help SHALL show the resolved declarations instead of hardcoded default labels
