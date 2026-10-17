## ADDED Requirements

### Requirement: Native lifecycle code runs inside the Node runtime
On every supported platform A1 SHALL ship its native lifecycle, containment, process-identity, terminal-restoration, and resident terminal-host code as Node-API addons loaded by the Node runtime, and SHALL NOT ship, materialize, or start an executable built from A1 sources. Every process A1 starts SHALL use the Node runtime that runs A1 as its image and an A1 entry script as its program; a process that must outlive its creator SHALL be that runtime running a fixed A1 entry. The retained containment, identity, exit-notice, and resident-launch contracts SHALL be preserved across this hosting change.

#### Scenario: Antivirus removes a release file
- **WHEN** a security product deletes a certified addon, entry, or other recorded file from an approved immutable release
- **THEN** the next launch or reinstall SHALL repair the release from the installed package when the package bytes match the release manifest
- **AND** A1 SHALL NOT require the user to configure or exclude paths in that security product to launch again

#### Scenario: Terminal-restoration owner survives the guardian
- **WHEN** the launch guardian is killed together with its contained runtime while an exit notice is armed
- **THEN** a Node-hosted watcher outside the guardian's containment SHALL deliver the notice and restore the terminal
- **AND** on Linux and macOS it SHALL perform bounded cleanup of the runtime's process group

#### Scenario: Every Node process is killed at once
- **WHEN** a kill targets every Node runtime process on the machine
- **THEN** the watcher ends with the guardian and runtime and no exit notice is delivered
- **AND** this gap SHALL be documented as accepted rather than worked around by starting a non-Node process

## MODIFIED Requirements

### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability. The resident terminal host is that explicit capability: its server and session holder SHALL be started only through the authenticated fixed-role native resident-launch path as the hosting Node runtime running the release's fixed role entry, SHALL be owned and cleaned up by the resident capability rather than by any launch instance, and SHALL NOT expose a generic escape service to other components. The launch guardian SHALL hold the containment boundary in-process through the native addon: on Windows the root runtime SHALL be created directly as a member of a kill-on-close Job Object, never started suspended and assigned afterwards; on Linux and macOS it SHALL be created in its own process group. Ordinary launch-instance and tab-child jobs SHALL NOT enable job-wide or silent breakaway; native admission SHALL verify artifact, role, profile, and request authority before resident creation. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

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

#### Scenario: Root runtime is created inside its job
- **WHEN** the launch guardian creates the root runtime on Windows
- **THEN** the runtime SHALL be a member of the instance's kill-on-close Job Object from its first instruction
- **AND** the guardian's own exit SHALL close that job and end every remaining member

#### Scenario: Forced attach termination
- **WHEN** an attach client is killed without running its own cleanup hooks
- **THEN** the surviving terminal-restoration owner SHALL restore the invoking terminal, while guardians remain lifecycle-only and the resident tab continues
