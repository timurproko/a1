## MODIFIED Requirements

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot. When resident agents are enabled, concurrent bare-A1 instances of the same profile SHALL attach to that profile's single resident agent host as independent clients; closing one client SHALL NOT affect another client or any resident agent.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

#### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

#### Scenario: Two bare A1 clients share resident agents
- **WHEN** two bare `a1` instances of one profile run with resident agents enabled and one of them exits
- **THEN** the remaining instance SHALL keep its tabs, active selection, and input unaffected, and every resident agent SHALL keep running
