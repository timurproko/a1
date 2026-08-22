## MODIFIED Requirements

### Requirement: Transparent terminal ownership remains native
During transparent handoff, the child and physical terminal SHALL own rendering, input encoding, selection, clipboard, scrollback, and terminal modes. A1 SHALL retain only per-instance lifecycle registration, process-tree ownership, lifecycle reporting, and bounded abnormal-exit cleanup.

#### Scenario: User interacts after handoff
- **WHEN** the user sends key, text, paste, focus, mouse, wheel, selection, clipboard, or resize actions
- **THEN** the native terminal path SHALL handle them without an A1 input command or application-specific translation

#### Scenario: Foreground ownership is lost
- **WHEN** the launch owner, guardian, or child fails during transparent attachment
- **THEN** A1 SHALL apply bounded cleanup to that instance's verified process tree, report that visual reconnection is unavailable, preserve unrelated instances, and leave the parent terminal usable

## ADDED Requirements

### Requirement: Every interactive shell path uses one launch-instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting the bare owned UI, vanilla Pi, or sandbox Pi runtime. Runtime selection SHALL occur inside that boundary so normal exit and abnormal owner loss have one close contract across all profiles.

#### Scenario: Launch bare A1
- **WHEN** the shell selects the owned UI runtime
- **THEN** the owned UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch an explicit Pi profile
- **WHEN** the shell selects `a1 pi` or `a1 sandbox`
- **THEN** the transparent Pi child and every process it creates SHALL belong to that command's launch instance without changing direct terminal attachment

#### Scenario: Another interactive instance is active
- **WHEN** the shell launches while one or more owned or transparent instances already exist
- **THEN** it SHALL create another independent launch instance rather than report a product-wide foreground lease conflict
