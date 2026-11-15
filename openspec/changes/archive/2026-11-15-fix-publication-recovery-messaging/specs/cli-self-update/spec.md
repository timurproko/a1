## ADDED Requirements

### Requirement: Recovery entry dispatch recognizes canonical path aliases

The standalone recovery entry SHALL recognize direct execution when the invoked path and loaded module identify the same canonical filesystem entry, including symlinked ancestors. Importing the entry from another module SHALL NOT dispatch worker, restore, or launcher behavior. Entry recognition SHALL NOT bypass capsule, digest, prior-release, npm-prefix, sidecar, or launcher-set verification.

#### Scenario: Recovery entry is invoked through a filesystem alias
- **WHEN** the updater invokes the copied recovery entry through a path whose ancestor resolves to a different canonical spelling
- **THEN** the recovery entry SHALL execute the requested verified recovery mode rather than silently exit without ownership or settlement evidence

#### Scenario: Aliased worker survives updater loss
- **WHEN** a verified recovery worker starts through an aliased entry path and the invoking updater exits after ownership transfer
- **THEN** the worker SHALL independently establish the complete target or verified recovery launcher set and record its durable disposition

#### Scenario: Cancellation reaches an aliased recovery worker
- **WHEN** cancellation is requested after an aliased recovery worker begins package replacement
- **THEN** the worker SHALL coordinate npm settlement and establish a callable complete launcher set before recording acknowledged cancellation

#### Scenario: Recovery helpers are imported
- **WHEN** another module imports the recovery entry's exported helpers
- **THEN** importing SHALL NOT interpret the importing process's arguments as a direct recovery invocation
