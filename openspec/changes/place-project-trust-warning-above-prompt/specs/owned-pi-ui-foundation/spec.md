## ADDED Requirements

### Requirement: Project-trust startup warnings use the prompt-adjacent notice
Bare A1 SHALL classify the bounded warning produced by a cancelled, interrupted, unavailable, or failed startup trust decision separately from ordinary engine startup diagnostics. After the trust selector restores the terminal and the restricted shell starts, the warning SHALL appear through the existing warning-colored transient dock notice immediately above the editor group. It SHALL remain outside transcript content, scrolling, selection, copy, prompt navigation, and persisted session content, and SHALL follow the existing dock-notice replacement and dismissal lifecycle. The pinned `a1 pi` route SHALL retain its startup-diagnostic placement.

#### Scenario: Cancel the startup trust selector
- **WHEN** the user cancels the startup trust selector in bare A1
- **THEN** A1 SHALL continue with project resources withheld
- **AND** one `Warning:` notice explaining the cancelled trust selection SHALL appear in the dock above the editor
- **AND** the warning SHALL not appear at the top of the empty transcript viewport

#### Scenario: Fail to obtain a trust decision
- **WHEN** startup cannot obtain a required trust decision because interaction is unavailable or trust resolution fails
- **THEN** bare A1 SHALL present the bounded warning through the same prompt-adjacent notice with project resources withheld

#### Scenario: Preserve comparison placement
- **WHEN** the same project-trust startup warning is presented through `a1 pi`
- **THEN** it SHALL retain the pinned startup-diagnostic placement instead of using bare A1's notice dock
