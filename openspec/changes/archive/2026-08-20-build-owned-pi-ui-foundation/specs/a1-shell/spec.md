## ADDED Requirements

### Requirement: Bare A1 launches the owned Pi UI
Bare `a1` SHALL launch the A1-owned Pi UI directly. The owned UI SHALL be the ordinary development and product path rather than an opt-in profile. Explicit `a1 pi` SHALL continue to launch untouched upstream Pi through transparent direct attachment, and `a1 sandbox` SHALL retain its existing behavior. The redundant `a1 ui` route SHALL NOT be exposed.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start and attach the owned Pi UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** A1 SHALL start a fresh owned session without replaying the prior retained terminal surface

#### Scenario: Launch the upstream fallback
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL start untouched upstream Pi through transparent direct attachment without routing through the owned UI

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

## REMOVED Requirements

### Requirement: Bare A1 launches one foreground command transparently
**Reason**: Bare A1 now exercises the owned Pi UI as the primary architecture throughout development and product use instead of reserving it behind an opt-in profile.

**Migration**: Users who require the untouched upstream transparent path can run `a1 pi`; `a1 sandbox` remains available unchanged.
