## ADDED Requirements

### Requirement: Releases may reuse certified immutable dependency content
A materialized release MAY bind release-specific product content to one or more separately certified immutable dependency layers. Layer identity SHALL derive from its complete selected runtime content, every release SHALL bind the exact layer identities it executes, and no mutable installation path SHALL remain a runtime dependency after activation.

#### Scenario: Consecutive releases use identical dependency content
- **WHEN** a newly installed release selects dependency-layer content identical to an existing certified layer
- **THEN** A1 SHALL reuse the existing immutable layer and stable dependency path rather than copy it into another release-specific dependency tree

#### Scenario: Dependency content changes
- **WHEN** any selected dependency module, package metadata, native binary, or declared runtime asset differs
- **THEN** A1 SHALL derive and certify a different layer identity before the new release can execute it

#### Scenario: A release binds a shared layer
- **WHEN** A1 validates, activates, rolls back, or launches a layered release
- **THEN** it SHALL verify that the release manifest, layer manifest, content identities, and managed paths agree before selecting its entry point

#### Scenario: A layer remains referenced
- **WHEN** any retained release or verified live cohort binds a dependency layer
- **THEN** garbage collection SHALL preserve that layer

#### Scenario: No release references a layer
- **WHEN** bounded retention removes the final release reference and no live cohort executes the layer
- **THEN** A1 SHALL make the layer eligible for ownership-safe collection

### Requirement: Existing full-copy releases remain valid compatibility cohorts
Introducing layered releases SHALL NOT invalidate an existing certified full-copy release that remains selected for rollback or used by a live cohort. New launches SHALL follow the active release layout, while each existing process SHALL continue using the layout from which it started.

#### Scenario: Update occurs while an old full-copy cohort is live
- **WHEN** a layered release becomes active while a verified full-copy release still serves live instances
- **THEN** the older cohort SHALL continue without path rewriting and its full release root SHALL remain retained until retirement

#### Scenario: Layered activation fails
- **WHEN** dependency-layer materialization, certification, binding, or startup fails
- **THEN** rollback SHALL select a verified compatible release as a whole and SHALL NOT combine product files from one release with dependencies from another
