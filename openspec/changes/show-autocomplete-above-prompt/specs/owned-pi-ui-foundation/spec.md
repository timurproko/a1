## ADDED Requirements

### Requirement: Above-prompt autocomplete is a declared bare-A1 presentation replacement
Bare A1 SHALL declare above-prompt autocomplete with a matching top line as a placement-and-decoration replacement for the ordinary editor's pinned below-prompt list. This named exception SHALL supersede pinned row-order, top-line decoration, and resulting editor-anchor parity only for that surface. The additional line SHALL match the prompt border's current color, glyph, and width and appear only while the menu has rendered rows; candidate rows SHALL retain their existing rendering, including background and padding. The replacement SHALL NOT apply menu-panel shading. Menu sizing and clipping, editor choice, history, contextual suggestions, settings, extensions, and unrelated shell behavior SHALL retain their existing contracts.

The replacement SHALL apply to slash-command, command-argument, path/resource, and extension-provider completions displayed by the default editor, with persistent history both enabled and disabled. It SHALL preserve candidate ordering, labels, descriptions, semantic styling, selection, the existing pagination and visible-item policy, configured keys, Tab/Enter application or submission semantics, Escape cancellation, and asynchronous provider lifecycle. It SHALL NOT reverse the list or change navigation direction merely because the list is above the prompt. Active autocomplete SHALL retain priority over contextual ghost suggestions.

The `a1 pi` comparison route, untouched pinned Pi, and extension-owned replacement editors SHALL retain their existing presentation and input ownership. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement this replacement.

#### Scenario: Complete commands and arguments
- **WHEN** equivalent input invokes slash-command or argument completion in bare A1
- **THEN** the same candidates, active-item behavior, and completion or command outcome SHALL remain available above the prompt
- **AND** Up and Down SHALL retain their established selection direction and configured keybindings

#### Scenario: Complete paths or provider resources
- **WHEN** a path/resource provider or an extension autocomplete provider returns candidates for the default editor
- **THEN** its normal results SHALL use the same above-prompt placement
- **AND** provider invocation, cancellation, selected value, and application behavior SHALL remain unchanged

#### Scenario: Use either history mode
- **WHEN** bare A1 opens autocomplete with persistent history enabled or disabled
- **THEN** the list and matching top line SHALL appear above the prompt in both modes
- **AND** each mode SHALL retain its existing editor path, recall, draft, undo, paste, and history-indicator semantics without activating durable history when disabled

#### Scenario: Keep autocomplete priority
- **WHEN** the default editor has an active completion list
- **THEN** Tab and the visible suggestion surface SHALL belong to autocomplete rather than contextual ghost suggestions
- **AND** accepting or canceling completion SHALL retain the established editor behavior

#### Scenario: Restore the default editor after an extension replacement
- **WHEN** an extension-owned editor is mounted and later unmounted
- **THEN** the extension editor SHALL retain its own presentation, focus, and input while mounted
- **AND** restoring the default editor SHALL restore above-prompt autocomplete and its matching top line without stale menu/line rows or hit regions

#### Scenario: Compare with pinned Pi
- **WHEN** equivalent completion input runs through `a1 pi` and untouched pinned Pi
- **THEN** their list placement, editor coordinates, candidates, and interactions SHALL retain their pinned behavior
- **AND** neither comparison producer SHALL gain the new top line
- **AND** only bare A1's explicitly declared placement and top-line differences SHALL be treated as expected autocomplete deviations
