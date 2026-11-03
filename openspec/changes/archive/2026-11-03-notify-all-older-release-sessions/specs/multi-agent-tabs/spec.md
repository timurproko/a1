## ADDED Requirements

### Requirement: The tab strip has configurable right-side Version and Time items
The resident tab strip SHALL support two right-side items in fixed order: `Version`, rendered as `v<executing attach-client package version>`, followed by `Time`, rendered with the existing live time-format setting. Both items SHALL be enabled by default. The version SHALL identify the immutable A1 release executing the attached outer client rather than the active release pointer or a resident Agent backend that may still execute an older retained release.

The configured enabled subset SHALL apply live. With both enabled, Version SHALL appear before Time with dim strip styling and a blank separation; with one enabled, only that item SHALL reserve right-side width; with neither enabled, tabs and controls SHALL receive all available width. The final enabled item SHALL retain one blank cell before the terminal's right edge. On a row too narrow for every enabled item plus usable strip controls, A1 MAY omit Version before omitting Time, and SHALL preserve valid cell geometry, complete glyphs, hit targets, and the existing tab-overflow rules.

#### Scenario: Default strip shows version before time
- **WHEN** a resident client running `0.2.7-dev.1238` renders the tab strip with default settings
- **THEN** the right side SHALL show `v0.2.7-dev.1238` before the formatted current time
- **AND** one blank cell SHALL remain after the time

#### Scenario: Show only one item
- **WHEN** the user enables only Version or only Time
- **THEN** the strip SHALL show only that selected right-side item and SHALL return the other item's cells to tab layout

#### Scenario: Hide both items
- **WHEN** the user disables Version and Time
- **THEN** the strip SHALL reserve no right-side status width and SHALL give those cells to tabs and controls

#### Scenario: Settings change while attached
- **WHEN** the enabled right-side items change while a resident client remains attached
- **THEN** the strip SHALL repaint with the new subset without restarting or disturbing the viewed child surface

#### Scenario: Outer client and Agent versions differ
- **WHEN** the attached outer client and a retained resident Agent backend execute different A1 versions
- **THEN** Version SHALL show the outer client's executing package version
