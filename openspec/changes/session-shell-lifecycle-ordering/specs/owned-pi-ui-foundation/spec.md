## ADDED Requirements

### Requirement: Session shell construction and teardown are transactional and ordered
Constructing the owned session shell SHALL release every engine binding it already acquired if construction fails, and composition SHALL dispose a constructed shell before releasing its own resources. Teardown SHALL unsubscribe from engine events before any other step, SHALL bound the wait on the engine's quit workflow with the existing cleanup deadline so the terminal is always restored, and SHALL make repeated disposal await the single in-flight teardown.

#### Scenario: Runtime construction fails after engine bindings
- **WHEN** the terminal runtime cannot be constructed after the shell subscribed to engine events and bound settings owners
- **THEN** the shell SHALL release those bindings and rethrow, and composition SHALL leave no armed shell behind

#### Scenario: An engine event arrives during teardown
- **WHEN** the engine delivers an event after disposal has begun
- **THEN** the shell SHALL ignore it and SHALL NOT update the view or request a render

#### Scenario: The engine hangs on quit
- **WHEN** the quit workflow does not settle within the cleanup deadline
- **THEN** the shell SHALL record a diagnostic, proceed with disposal, and restore the terminal
