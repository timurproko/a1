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
