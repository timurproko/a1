# multi-agent-tabs Specification

## Purpose
Defines the opt-in resident-tab path that keeps bare A1 running independently of its attached terminal and restores the same retained session when the user returns.

## Requirements

### Requirement: A1 runs one agent per launch without resident tabs
Bare `a1` SHALL run one owned single-agent UI per launch and SHALL NOT offer resident tabs, a tab strip, utility tabs, or tab maintenance commands.

#### Scenario: Tab commands are not offered
- **WHEN** the user runs `a1 tabs` or `a1 solo`
- **THEN** A1 SHALL exit without starting a UI or contacting any host
- **AND** help and usage SHALL list neither word
