## MODIFIED Requirements

### Requirement: Bare AddOne launches one foreground command transparently
Bare `addone` and `a1` SHALL launch the selected foreground profile immediately without an AddOne intro, logo, version frame, chrome, reconstructed readiness frame, or other application output before the child. Until a later accepted cutover, the initial profile SHALL launch Native Pi through transparent direct attachment. The AddOne-owned Pi UI SHALL be reached only through its explicitly selected development path until that later cutover is accepted, and `a1 pi` SHALL always bypass it as exact upstream vanilla Pi using ordinary `~/.pi/agent`.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs `a1` in a supported terminal before the accepted owned-UI cutover
- **THEN** AddOne SHALL start and attach one Native Pi process and the first application content SHALL be the child's own output

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare AddOne after prior foreground generations exited
- **THEN** AddOne SHALL start a fresh generation without replaying a retained terminal surface

#### Scenario: Select the owned UI development path
- **WHEN** the user selects the explicitly named owned-UI development mode
- **THEN** AddOne SHALL launch the AddOne-owned fullscreen Pi UI rather than silently replacing `a1 pi` or transparent bare AddOne behavior

#### Scenario: Launch explicit vanilla Pi
- **WHEN** the user runs `a1 pi`
- **THEN** AddOne SHALL bypass the owned UI and transparently attach exact upstream vanilla Pi using ordinary `~/.pi/agent`
