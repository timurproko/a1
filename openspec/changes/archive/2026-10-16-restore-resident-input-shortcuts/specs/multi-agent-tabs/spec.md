# Spec Delta

## ADDED Requirements

### Requirement: Resident tabs preserve prompt keyboard modifiers
After resolving tab-owned actions, bare A1's resident attach client SHALL forward supported Ctrl, Alt, and Shift keyboard combinations with the same key identity and modifiers observed by the direct solo-agent prompt. A modified key SHALL NOT degrade into its unmodified form while crossing the resident terminal boundary.

#### Scenario: Move by word in a resident prompt
- **WHEN** the user presses Ctrl+Left or Ctrl+Right while editing a prompt in a resident tab
- **THEN** the prompt cursor SHALL move by one word in the requested direction exactly as it does in direct solo-agent mode

#### Scenario: Use other modified prompt keys
- **WHEN** the user invokes a supported prompt action with modified arrow, navigation, Enter, Backspace, Delete, Tab, or character input in a resident tab
- **THEN** the child prompt SHALL receive the original key identity and modifiers and invoke the same effective binding as direct solo-agent mode

#### Scenario: Keep tab actions authoritative
- **WHEN** a modified key resolves to an active tab-owned action
- **THEN** the attach client SHALL invoke that tab action without also forwarding the key to the child prompt
