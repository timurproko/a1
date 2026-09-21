## ADDED Requirements

### Requirement: The thinking selector advertises its effective cycle shortcut
The bare-A1 thinking selector SHALL derive its cycle-shortcut label from the active A1 keybinding declarations used for dispatch. With default bindings it SHALL display `Ctrl+L cycles thinking levels in-session` and SHALL NOT display `Shift+Tab` as the cycle shortcut. An explicit user override SHALL replace the displayed key with the effective resolved override without rewriting the user's configuration.

#### Scenario: Open the selector with default bindings
- **WHEN** the user opens the bare-A1 thinking selector with default keybindings
- **THEN** the selector SHALL display `Ctrl+L cycles thinking levels in-session`
- **AND** it SHALL NOT advertise `Shift+Tab` as the thinking-level cycle shortcut

#### Scenario: Open the selector with a custom cycle binding
- **WHEN** the user opens the bare-A1 thinking selector after explicitly overriding the thinking-level cycle binding
- **THEN** the selector SHALL display the effective override using the same platform-aware key-label grammar as other shortcut help
- **AND** the displayed key SHALL invoke the thinking-level cycle action in the agent input

#### Scenario: Keep profile presentations isolated
- **WHEN** bare A1 and the `a1 pi` comparison profile construct their thinking selectors
- **THEN** each selector SHALL use its own active profile's resolved shortcut presentation
- **AND** constructing either selector SHALL NOT change the other profile's effective bindings
