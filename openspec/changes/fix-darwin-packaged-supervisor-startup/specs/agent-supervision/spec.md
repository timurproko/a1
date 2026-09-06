## ADDED Requirements

### Requirement: Supervisor startup is bounded and diagnosable
When bootstrap starts a detached supervisor for a verified immutable release, supervisor readiness or failure SHALL be correlated to that exact startup attempt and observed within a bounded interval. A failure before endpoint publication SHALL preserve a bounded, sanitized diagnostic and process outcome rather than being reported only as a generic readiness timeout. Startup evidence SHALL NOT expose credentials, prompts, session content, or unrelated environment values.

#### Scenario: Supervisor publishes its endpoint
- **WHEN** a detached supervisor validates its release, opens its cohort endpoint, and publishes matching endpoint metadata
- **THEN** bootstrap SHALL recognize readiness for that exact release and continue without retaining a false failure record

#### Scenario: Supervisor exits before readiness
- **WHEN** the detached supervisor fails release validation, storage initialization, endpoint binding, or another pre-listen operation
- **THEN** bootstrap SHALL fail within the startup bound with the correlated exit outcome and sanitized startup diagnostic

#### Scenario: Stale startup evidence exists
- **WHEN** a prior supervisor attempt left success or failure evidence under the same runtime root
- **THEN** a new attempt SHALL NOT accept that evidence unless its unguessable attempt identity and selected release identity match

### Requirement: Darwin launch instances use certified native containment
On supported macOS systems, every A1-owned interactive launch instance SHALL use a verified Darwin-native guardian that creates an independently addressable process group, publishes the root process start identity and containment identity, transfers foreground-terminal ownership when applicable, and terminates the owned group after root exit, owner loss, or bounded shutdown. The Darwin guardian artifact SHALL be marked supported only when its platform, architecture, bytes, native protocol, process identity, and containment behavior are certified.

#### Scenario: Darwin interactive root starts
- **WHEN** a verified macOS cohort launches `a1` or `a1 pi`
- **THEN** the native guardian SHALL spawn the selected root in its own process group, publish stable process and containment identities, and transfer foreground ownership without shell interpretation

#### Scenario: Darwin owner disappears
- **WHEN** the authenticated launch owner exits or disconnects while its Darwin process group remains live
- **THEN** A1 SHALL perform bounded group cleanup and SHALL preserve unrelated launch instances

#### Scenario: Darwin root exits normally
- **WHEN** the contained root process exits
- **THEN** the guardian SHALL clean remaining members of that owned process group, restore prior terminal foreground ownership when applicable, and report the root outcome

#### Scenario: Darwin artifact is unsupported or inconsistent
- **WHEN** the packed guardian manifest is unsupported, names the wrong platform or architecture, or does not match the guardian bytes
- **THEN** launch SHALL fail before creating a launch instance and SHALL NOT downgrade to uncontained execution
