## ADDED Requirements

### Requirement: Every tab kind uses one tab-bar provider contract

The resident tab bar SHALL consume one registered provider contract for every tab kind. Each registration SHALL declare the kind's stable name, label, shortcut action, multiplicity, activation behavior, prewarm policy, renameability, Agent-session ownership, child route when present, and launcher marker. The command palette, plus launcher, shortcut dispatch, context menu, visibility handling, server reservation, registry validation, session handling, and route delivery SHALL use those registrations rather than separate Agent, Settings, Changelog, or utility-kind branches.

A multi-instance create kind SHALL create one new tab on every activation. A singleton toggle kind SHALL create its one tab when absent, reveal and activate it when hidden, activate it without moving it when already shown, and hide it according to the shared toggle behavior when it is viewed. Adding a future kind SHALL require one provider registration and its child content, not another parallel tab lifecycle.

#### Scenario: Activate every registered kind through one recipient

- **WHEN** Agent, Settings, or Changelog is invoked from its shortcut, the command palette, or the plus launcher
- **THEN** the tab bar SHALL pass that registered kind to the same activation recipient
- **AND** the provider's multiplicity and activation policy SHALL determine whether a tab is created, activated, revealed, or hidden

#### Scenario: Toggle a singleton tab

- **WHEN** a registered singleton-toggle tab is absent, hidden, already shown, or currently viewed
- **THEN** repeated activation SHALL respectively create it, reveal and activate it, activate it in its existing slot, or hide it through the shared toggle behavior

#### Scenario: Apply kind capabilities

- **WHEN** the tab bar or server needs to offer Rename, persist Agent session metadata, prewarm a singleton, validate a registry kind, or deliver a child route
- **THEN** it SHALL query the registered kind capabilities rather than infer behavior from a concrete tab name or a utility category

### Requirement: Newly added tabs append through the tab-bar ordering API

The resident tab bar SHALL own one kind-neutral ordering API over live tabs. A newly created tab and a hidden tab that newly joins the strip SHALL be placed after every tab already shown in strip order. Selecting a tab already in the strip SHALL retain its current slot, including a slot established by drag-and-drop. Stopped durable registry records SHALL NOT affect the visible insertion destination. Cold creation, prewarmed promotion, and singleton reveal SHALL use the same ordering API and SHALL NOT branch on tab kind.

#### Scenario: Create an Agent after Settings

- **WHEN** an Agent is shown, Settings is opened after it, and another Agent is created
- **THEN** the strip order SHALL be the first Agent, Settings, and the new Agent

#### Scenario: Reveal a hidden singleton after later tabs

- **WHEN** a singleton tab is prewarmed while hidden and other tabs are added before it is opened
- **THEN** opening it SHALL place it after every tab currently shown

#### Scenario: Keep an existing dragged slot

- **WHEN** a shown singleton or multi-instance tab was dragged to a different slot and is activated again
- **THEN** activation SHALL select it without changing its durable order

#### Scenario: Ignore stopped records

- **WHEN** stopped registry records occur before, between, or after the live tabs
- **THEN** a new or newly shown tab SHALL still become the final visible tab
