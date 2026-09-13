## ADDED Requirements

### Requirement: Completed compactions reuse established submitted-prompt state styling
Bare A1 SHALL preserve the ordinary submitted-prompt styling established before the prompt-style compaction changes and apply that same styling to completed compactions. Naturally visible source timestamps SHALL retain their existing metadata presentation. Prominent pinned timestamps SHALL use the same normal prompt foreground as the pinned text. After the full source block scrolls above the viewport, the whole pinned row, including the timestamp, SHALL use the existing quiet presentation. Hovering SHALL restore the baseline prominent text and timestamp, white in the default dark theme. Neither ordinary prompts nor compactions SHALL receive a timestamp-specific intensity exemption, new palette, or separate hover policy.

#### Scenario: Read a prominent pinned row
- **WHEN** a user prompt or completed compaction has a pinned header while continuation rows remain visible
- **THEN** its timestamp SHALL use the existing normal prompt foreground and intensity
- **AND** the corresponding naturally visible source timestamp SHALL retain its baseline metadata styling

#### Scenario: Scroll beyond and hover the full block
- **WHEN** the full prompt or compaction source scrolls above the viewport
- **THEN** the prefix, content, and timestamp SHALL all acquire the existing quiet presentation
- **AND** hovering SHALL restore the baseline prominent text and timestamp together
- **AND** leaving hover SHALL restore the quiet row without special timestamp treatment

#### Scenario: Compare prompts and compactions
- **WHEN** equivalent ordinary prompts and completed compactions are displayed in source, prominent-pinned, quiet-pinned, or hovered states
- **THEN** their prompt-style foreground, background, and intensity rules SHALL match
- **AND** the compaction's full inline generated header SHALL remain normal weight with its complete summary available by ordinary scrolling

#### Scenario: Preserve layout and transcript behavior
- **WHEN** the reader resizes, changes governing anchors, navigates, selects, copies, or activates native links
- **THEN** original timestamps, local `HH:mm` formatting, alignment, unavailable-timestamp and narrow-width omission, prompt navigation, click-to-source, semantic copy, link behavior, and bounded rendering SHALL remain unchanged
- **AND** the `a1 pi` comparison route SHALL retain its existing behavior
