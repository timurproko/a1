## ADDED Requirements

### Requirement: Bare AddOne launches the owned Pi UI
Bare `a1` SHALL launch the AddOne-owned Pi UI directly. The owned UI SHALL be the ordinary development and product path rather than an opt-in profile. Explicit `a1 pi` SHALL continue to launch untouched upstream Pi through transparent direct attachment, and `a1 sandbox` SHALL retain its existing behavior. The redundant `a1 ui` route SHALL NOT be exposed.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs `a1`
- **THEN** AddOne SHALL start and attach the owned Pi UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare AddOne after a previous owned foreground session exited
- **THEN** AddOne SHALL start a fresh owned session without replaying the prior retained terminal surface

#### Scenario: Launch the upstream fallback
- **WHEN** the user runs `a1 pi`
- **THEN** AddOne SHALL start untouched upstream Pi through transparent direct attachment without routing through the owned UI

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** AddOne SHALL reject the unsupported profile and SHALL NOT silently select another runtime

## REMOVED Requirements

### Requirement: Bare AddOne launches one foreground command transparently
**Reason**: Bare AddOne now exercises the owned Pi UI as the primary architecture throughout development and product use instead of reserving it behind an opt-in profile.

**Migration**: Users who require the untouched upstream transparent path can run `a1 pi`; `a1 sandbox` remains available unchanged.
