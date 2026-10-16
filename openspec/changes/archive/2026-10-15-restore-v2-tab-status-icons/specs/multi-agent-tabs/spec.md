## MODIFIED Requirements

### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show structured status: v2's ordered Braille progress frames `⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, and `⠏` at an 80 ms cadence while working, yellow `?` while an extension, trust, or permission request awaits the user, `✓` when a turn settled while no client viewed the tab and it has not been viewed since, `✗` when the last turn errored or the tab crashed or failed, the same progress frames in the dim lifecycle color while starting or restoring, and no glyph when idle. Working frames SHALL use the resolved A1 accent reported by that specific tab. Status SHALL derive from sequenced engine events through the authenticated tab bridge, never terminal output, rendered cells, titles, or timing. A missing bridge SHALL degrade to process-level states and the launch accent. Viewing a tab in any client SHALL clear its `✓` everywhere. Open tabs SHALL have no suspended state or `◌` glyph.

#### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show yellow `?` until the request is answered

#### Scenario: Background tab finishes
- **WHEN** a background tab's agent completes a turn
- **THEN** its chip SHALL show `✓` until any client views it, then clear everywhere

#### Scenario: Working tabs have independent accents
- **WHEN** two working tabs report different resolved A1 accents
- **THEN** each chip's v2 progress frame SHALL use its own reported accent

#### Scenario: Starting and restoring tabs animate dimly
- **WHEN** a tab is starting or restoring
- **THEN** its chip SHALL animate through the v2 progress frames at 80 ms in the dim lifecycle color rather than showing a static ellipsis or quarter-circle glyph

#### Scenario: Terminal-looking output cannot fake status
- **WHEN** a tab prints spinner characters, `✓`, or a title containing status words
- **THEN** chip status SHALL remain determined only by the bridge

#### Scenario: Out-of-order status
- **WHEN** a report has a lower sequence or superseded incarnation
- **THEN** the server SHALL discard it and retain the newer status
