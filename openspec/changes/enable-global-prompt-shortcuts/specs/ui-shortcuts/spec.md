## ADDED Requirements

### Requirement: Effective prompt-editing shortcuts do not depend on a prompt click
While bare A1's ordinary prompt is the active input surface, every effective declared prompt-editing action SHALL remain dispatchable after interaction with the session content area without requiring the user to click inside the prompt. This SHALL include selection, copy, cut, paste, undo, redo, deletion, and caret, word, and line navigation actions, as well as future actions declared in the same ordinary-prompt editing scope.

Dispatch SHALL continue to use the active keybinding declarations and supported terminal key matching rather than a second hardcoded content-area shortcut list. Explicit user overrides SHALL retain their existing resolution and conflict semantics. A shortcut already owned by a selected transcript range or declared viewport action SHALL perform only that higher-precedence action, and focused modal or replacement-input scopes SHALL remain isolated.

#### Scenario: Use the standard editing actions after a content click
- **WHEN** the ordinary prompt is active, the reader interacts with session content, and then invokes effective selection, clipboard, undo/redo, deletion, or cursor navigation bindings
- **THEN** each binding SHALL invoke its ordinary prompt action exactly once without another prompt click
- **AND** no raw key sequence SHALL be inserted into the draft

#### Scenario: Use a remapped prompt action
- **WHEN** a user override remaps an ordinary-prompt editing action and the reader invokes that effective key after interacting with content
- **THEN** the remapped declaration SHALL dispatch the action
- **AND** the displaced default key SHALL NOT acquire an undeclared fallback behavior from content-area routing

#### Scenario: Add a future prompt-editing declaration
- **WHEN** a prompt-editing action is added to the ordinary-prompt scope
- **THEN** it SHALL gain the same post-content-interaction availability through declared dispatch
- **AND** no separate viewport shortcut inventory SHALL require updating

#### Scenario: A higher-precedence scope owns the key
- **WHEN** transcript selection, a viewport action, a modal, or a replacement input owns an effective key
- **THEN** that owner SHALL receive the key according to its existing semantics
- **AND** the ordinary prompt action SHALL NOT also run
