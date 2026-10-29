## ADDED Requirements

### Requirement: Active tab chips share one resolved color
The resident tab strip SHALL derive the selected-chip background for Agent, Settings, Changelog, and future registered tab kinds from one strip-level resolved owned Accent color. Tab kind and per-tab status accent SHALL NOT select a different active background. When the owned settings document omits an Accent value, native presentation SHALL use the same blue default as the owned settings API and utility bridge.

A locally pending Agent MAY use a lighter initialization shade, but that shade and its settled selected shade SHALL both derive from the same strip-level active color. When the real Agent surface commits, the selected chip MAY fill from the initialization shade into the shared settled shade without changing tab geometry or delaying the body.

#### Scenario: Different tab kinds become active
- **WHEN** the user switches among Agent, Settings, and Changelog tabs under one resolved Accent setting
- **THEN** each viewed chip SHALL use the same settled active background
- **AND** no utility-specific fallback color SHALL replace that background

#### Scenario: The Accent setting is omitted
- **WHEN** the profile has no stored Accent value
- **THEN** Agent, Settings, and Changelog active chips SHALL use the owned blue default
- **AND** native presentation SHALL NOT reinterpret the missing value as purple

#### Scenario: A new Agent initializes
- **WHEN** a locally pending Agent is shown before its first complete surface
- **THEN** its selected chip SHALL use a lighter shade derived from the shared active color
- **AND** its fill SHALL settle into the same active background used by every committed tab kind

#### Scenario: Tab status colors differ
- **WHEN** background tabs report different working or attention status accents
- **THEN** their status glyphs MAY retain those per-tab semantic colors
- **AND** viewing either tab SHALL still use the common selected-chip background

### Requirement: Newly added tabs append without initialization reordering
The resident tab bar SHALL place a newly added visible tab after every currently shown tab through one kind-neutral insertion API. A locally pending Agent and its committed registry tab SHALL use the same appended slot. Initialization state, selected-chip color, fill progress, and tab kind SHALL NOT choose or change the insertion position.

#### Scenario: An Agent starts beside a visible utility tab
- **WHEN** the user adds an Agent while Settings or Changelog is visible in the strip
- **THEN** the pending Agent chip SHALL appear after all currently shown chips
- **AND** no utility-tab identity check SHALL place it before an existing chip

#### Scenario: The pending Agent commits
- **WHEN** the newly added Agent receives its first complete surface and replaces the pending chip
- **THEN** the committed Agent chip SHALL remain in the pending chip's appended position
- **AND** the initialization fill SHALL NOT cause a tab-order jump

#### Scenario: A future tab kind is added
- **WHEN** another registered tab kind adds a new visible tab
- **THEN** the same append operation SHALL determine its position
- **AND** the tab bar SHALL NOT require a kind-specific insertion branch

### Requirement: Agent prompt chrome uses its destination color immediately
The pending Agent prompt's horizontal borders SHALL use the final owned Accent border color from their first frame and SHALL NOT participate in the selected-chip initialization transition. The landing wordmark SHALL use that same destination color. Only the selected Agent tab chip MAY transition from a lighter initialization shade into its settled active background.

#### Scenario: A pending Agent prompt appears
- **WHEN** the local pending Agent shell paints before the real Agent surface
- **THEN** both horizontal prompt borders SHALL already use the final destination color
- **AND** their color SHALL NOT depend on chip-fill progress

#### Scenario: The real Agent surface commits
- **WHEN** the real Agent editor replaces the pending shell
- **THEN** the prompt-border color SHALL remain unchanged across the handoff
- **AND** only the selected tab chip MAY continue or complete its fill transition

#### Scenario: The landing logo is shown
- **WHEN** the resident landing wordmark is visible under a resolved Accent
- **THEN** the logo SHALL use the same destination color as the Agent prompt borders
- **AND** it SHALL NOT use a separate provisional or brighter accent color
