## ADDED Requirements

### Requirement: The session shell depends on a declared backend port
The application layer under `src/app` SHALL depend on the `OwnedUiSessionBackend` interface declared in `src/contracts/owned-ui`, never on the `PiEngineAdapter` class or a type alias to it. The Pi engine adapter SHALL declare that it implements the interface. Payload types crossing the interface SHALL be declared in the contract owner and SHALL reference no pinned Pi package type.

#### Scenario: A shell file names the adapter class
- **WHEN** a file under `src/app` imports `PiEngineAdapter` as a type or value
- **THEN** the architecture check SHALL fail and name the file

#### Scenario: The adapter stops satisfying the port
- **WHEN** a member required by `OwnedUiSessionBackend` is removed from or retyped in the adapter
- **THEN** the type check SHALL fail at the adapter's `implements` declaration
