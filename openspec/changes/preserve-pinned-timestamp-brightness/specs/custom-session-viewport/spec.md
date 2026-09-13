## ADDED Requirements

### Requirement: Pinned timestamps retain their pre-dimming brightness
In bare A1, the timestamp of a pinned submitted prompt or completed compaction SHALL retain the same metadata foreground color and brightness it has while that pinned row is prominent. When the complete source block scrolls above the viewport, the prefix and content SHALL retain their existing quiet presentation, but the timestamp SHALL NOT receive additional fading. This timestamp exception SHALL apply equally to ordinary prompts and completed compactions. It SHALL NOT brighten the existing prominent timestamp, substitute the prompt-text color, or change the theme palette.

#### Scenario: Scroll past a complete source block
- **WHEN** a pinned prompt or completed compaction changes from prominent to quiet after its full source scrolls above the viewport
- **THEN** the timestamp SHALL keep its pre-transition color and brightness without additional faint styling
- **AND** the prefix and content SHALL fade exactly as before

#### Scenario: Return to prominent presentation
- **WHEN** scrolling reveals continuation rows again, or hovering temporarily restores the pinned row's prominent presentation
- **THEN** the timestamp SHALL retain the same color and brightness throughout the transition
- **AND** the remainder of the row SHALL retain its existing prominent and hover behavior

#### Scenario: Retain source metadata and layout
- **WHEN** a prompt or compaction is pinned, resized, or activated to return to its source
- **THEN** the original event time, local `HH:mm` formatting, alignment, and existing insufficient-width or unavailable-timestamp omission SHALL remain unchanged
- **AND** naturally visible source rows SHALL retain their existing timestamp styling
- **AND** a later governing anchor SHALL show its own timestamp without stale styling or metadata

#### Scenario: Preserve unrelated transcript behavior
- **WHEN** the reader navigates, selects, copies, or follows native links around a pinned timestamp
- **THEN** prompt and compaction navigation, click-to-source, semantic copy excluding sticky duplicates, link targets and colors, and bounded rendering SHALL remain unchanged
- **AND** the `a1 pi` comparison route SHALL retain its existing presentation
