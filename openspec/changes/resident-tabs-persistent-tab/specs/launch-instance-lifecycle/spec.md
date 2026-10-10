## MODIFIED Requirements

### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability. The resident terminal host is that explicit capability: its server and session holder SHALL be started only through the authenticated fixed-role native resident-launch path, SHALL be owned and cleaned up by the resident capability rather than by any launch instance, and SHALL NOT expose a generic escape service to other components. Ordinary launch-instance and tab-child jobs SHALL NOT enable job-wide or silent breakaway; native admission SHALL verify artifact, role, profile, and request authority before resident creation. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

#### Scenario: Runtime starts descendants
- **WHEN** an owned UI or Pi runtime starts extension daemons, agent workers, tools, or further descendants
- **THEN** those processes SHALL remain members of the originating launch instance and SHALL NOT become unowned background runtime processes

#### Scenario: A component requests implicit detachment
- **WHEN** an instance-owned component attempts to survive the closure of its originating instance without an explicit resident capability
- **THEN** A1 SHALL retain it within terminate-on-close ownership rather than silently detaching it

#### Scenario: Resident tab outlives a bare-A1 instance
- **WHEN** a bare-A1 launch instance with resident tabs enabled closes normally or through terminal loss
- **THEN** A1 SHALL terminate that instance's attach-client process tree and SHALL leave the resident server, the holder, and the tab process running

#### Scenario: Processes started inside a tab
- **WHEN** A1 running in the resident tab starts tools or extension subprocesses
- **THEN** those processes SHALL belong to that tab's holder-owned process tree and SHALL be terminated when the holder ends

#### Scenario: Ordinary descendant requests job breakaway
- **WHEN** a tool or helper requests `CREATE_BREAKAWAY_FROM_JOB` inside an ordinary A1-owned job
- **THEN** A1 SHALL NOT have enabled a job-wide escape permission for it, and an ordinary contained spawn SHALL remain terminate-on-close

#### Scenario: Forced attach termination
- **WHEN** an attach client is killed without running its own cleanup hooks
- **THEN** the surviving terminal-restoration owner SHALL restore the invoking terminal, while guardians remain lifecycle-only and the resident tab continues
