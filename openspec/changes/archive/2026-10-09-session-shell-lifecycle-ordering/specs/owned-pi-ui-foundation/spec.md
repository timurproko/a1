## ADDED Requirements

### Requirement: Session shell construction and teardown are transactional and ordered
Constructing the owned session shell SHALL release every binding it already acquired, including engine bindings and its root, if construction fails, and SHALL rethrow the failure. Teardown SHALL stop delivering engine events to the view before any other step, SHALL bound how long the engine's quit workflow can hold the terminal with the existing cleanup deadline so the terminal is always restored, and SHALL give every concurrent disposal caller the single in-flight teardown.

#### Scenario: Construction fails after engine bindings
- **WHEN** a step of shell construction throws after the shell subscribed to engine events and bound settings owners
- **THEN** the shell SHALL release those bindings, its workflow interaction host, and its root, and rethrow the failure

#### Scenario: An engine event arrives during teardown
- **WHEN** the engine delivers an event after disposal has been requested
- **THEN** the shell SHALL ignore it and SHALL NOT update the view or request a render

#### Scenario: The engine hangs on quit
- **WHEN** the quit workflow does not settle within the cleanup deadline
- **THEN** the shell SHALL proceed with disposal and restore the terminal, and SHALL report the quit outcome once the engine settles
