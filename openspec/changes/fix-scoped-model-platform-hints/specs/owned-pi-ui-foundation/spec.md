## ADDED Requirements

### Requirement: Scoped-model shortcut hints preserve pinned platform presentation
The owned scoped-model selector SHALL display every shortcut hint from its effective binding identities using pinned Pi's platform-specific key labels before styling and layout. On macOS, an Alt modifier SHALL display as `option`; on Windows and Linux it SHALL retain `alt`. The selector SHALL preserve the pinned spelling of other key parts, alternative-binding order and separators, and empty-binding presentation. For equivalent model state, bindings, theme, color mode, and terminal width, its header and footer SHALL match pinned Pi's visible text, semantic ANSI, spacing, padding, and wrapping. Display formatting SHALL NOT alter binding identities, shortcut matching, model ordering, session-only changes, explicit persistence, refresh outcomes, or cancellation behavior.

#### Scenario: Default reorder hints on macOS
- **WHEN** the scoped-model selector renders on macOS with the default reorder bindings
- **THEN** its footer SHALL display `option+up/option+down reorder`
- **AND** the formatted text SHALL wrap and align exactly as pinned Pi at the same width, including the observed 80-column case
- **AND** input matching SHALL continue to use the logical `alt+up` and `alt+down` bindings

#### Scenario: Default reorder hints on Windows or Linux
- **WHEN** the scoped-model selector renders on Windows or Linux with the default reorder bindings
- **THEN** its footer SHALL retain `alt+up/alt+down reorder` and the pinned layout for that platform

#### Scenario: Effective custom bindings contain alternatives
- **WHEN** a scoped-model action has an effective custom binding or an ordered list of alternatives
- **THEN** every displayed alternative SHALL use pinned platform formatting without changing its order or non-Alt key parts
- **AND** the header's save hint and every footer hint SHALL follow the same display rules
- **AND** the configured bindings SHALL still trigger their original actions

#### Scenario: An action is unbound
- **WHEN** a scoped-model action has no effective keys
- **THEN** its hint SHALL match pinned Pi's empty-binding presentation without inventing a default shortcut or command fallback

#### Scenario: Selector state changes after presentation
- **WHEN** the user changes enabled models or their order, saves changes, or receives a catalog refresh outcome
- **THEN** refreshed help SHALL retain platform-correct key labels and pinned state-dependent text and styling
- **AND** model changes SHALL remain session-only until explicitly saved, and cancellation SHALL preserve its existing semantics
