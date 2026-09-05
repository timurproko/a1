## ADDED Requirements

### Requirement: Forward prompt navigation includes the transcript bottom

In the bare-A1 custom transcript viewport, Shift+Down SHALL navigate to the next submitted prompt when one exists after the current navigation stop. When the transcript contains at least one submitted prompt and no later prompt exists, Shift+Down SHALL perform the same bottom-navigation transition as End: reach the final legal scroll position, resume following output, and clear the pending-new-message count. Shift+Up SHALL retain its existing reverse prompt navigation, including the opening spacer at the first-prompt stop. This behavior SHALL NOT change the pinned `a1 pi` route or override modal input ownership.

#### Scenario: Navigate forward through prompts and then to the bottom
- **WHEN** the user repeatedly presses Shift+Down from an earlier prompt in a transcript with multiple prompts and a response tail below the last prompt
- **THEN** each later prompt SHALL remain a navigation stop in order
- **AND** one further Shift+Down from the last prompt SHALL reach the bottom instead of remaining at that prompt

#### Scenario: Resume live output like End
- **WHEN** the user presses Shift+Down from the last prompt while detached from the bottom with pending new messages
- **THEN** the viewport SHALL reach the same scroll position and following state as pressing End from the same state
- **AND** the pending-new-message count SHALL clear
- **AND** subsequent output SHALL remain followed at the bottom

#### Scenario: Reverse from the bottom
- **WHEN** the user presses Shift+Up after reaching the bottom with Shift+Down and the last prompt lies above the bottom scroll position
- **THEN** the viewport SHALL return to the last prompt
- **AND** further Shift+Up presses SHALL visit earlier prompts, preserving the first prompt's opening spacer
- **AND** Shift+Down SHALL allow navigation forward to the bottom again

#### Scenario: Navigate from within the final response
- **WHEN** the viewport is detached within content after the last prompt and the user presses Shift+Down
- **THEN** the viewport SHALL perform the same bottom-navigation transition as End

#### Scenario: Only one submitted prompt
- **WHEN** the user presses Shift+Down from the first-prompt stop in a single-prompt transcript whose response extends below the viewport
- **THEN** the viewport SHALL reach the bottom and resume following without stopping on the prompt's opening spacer

#### Scenario: Already at the bottom or the transcript fits
- **WHEN** the user presses Shift+Down while already following the bottom, including when the entire transcript fits within the viewport
- **THEN** the viewport SHALL remain at the bottom in following mode without wrapping to an earlier prompt

#### Scenario: No submitted prompts
- **WHEN** the user presses Shift+Down in the custom viewport with no submitted prompt anchors
- **THEN** the viewport's scroll position and following state SHALL remain unchanged

#### Scenario: Preserve input ownership and supported encodings
- **WHEN** any currently supported Shift+Down encoding reaches active custom-viewport navigation
- **THEN** it SHALL trigger the same forward-navigation behavior and remain consumed without modifying the editor draft
- **AND** when a modal owns input or custom-viewport navigation is disabled, existing input routing SHALL remain unchanged
