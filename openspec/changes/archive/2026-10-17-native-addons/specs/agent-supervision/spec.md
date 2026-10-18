## ADDED Requirements

### Requirement: Approved releases with missing certified files are repaired before launch
Before launching an approved active release from its restart certification, bootstrap SHALL confirm that every file the release manifest records is present. When a recorded file is missing or its digest differs, bootstrap SHALL rewrite that file from the installed package when the package source bytes match the manifest digest and the package version equals the release version, restore the recorded file mode, and fully verify the release before launching it. Repair SHALL NOT rename or delete a release directory, change a release identity, or touch dependency layers. When repair is impossible, bootstrap SHALL continue on its ordinary materialization path and SHALL NOT launch the damaged copy.

#### Scenario: A certified file is missing
- **WHEN** an approved active release lacks a file its manifest records and the installed package holds bytes matching that file's digest
- **THEN** bootstrap SHALL restore the file with its recorded mode, verify the release, and launch it

#### Scenario: Reinstall of the same version
- **WHEN** the installed package materializes to a release identity that already exists on disk but fails verification
- **THEN** materialization SHALL repair the existing release from the package instead of failing verification or creating a duplicate

#### Scenario: Package bytes do not match
- **WHEN** the installed package's bytes for a missing file do not hash to the manifest digest
- **THEN** repair SHALL fail with a diagnosable reason and bootstrap SHALL NOT launch the damaged release

## MODIFIED Requirements

### Requirement: Darwin launch instances use certified native containment
On supported macOS systems, every A1-owned interactive launch instance SHALL use the verified Darwin containment of the native addon loaded by the launch guardian, which creates an independently addressable process group, publishes the root process start identity and containment identity, transfers foreground-terminal ownership when applicable, and terminates the owned group after root exit, owner loss, or bounded shutdown. Owner loss SHALL be covered by a Node-hosted watcher outside the guardian's containment. The Darwin addon artifact SHALL be marked supported only when its platform, architecture, bytes, native protocol, process identity, and containment behavior are certified.

#### Scenario: Darwin interactive root starts
- **WHEN** a verified macOS cohort launches `a1` or `a1 pi`
- **THEN** the addon SHALL spawn the selected root in its own process group without a fork of the Node runtime, publish stable process and containment identities, and transfer foreground ownership without shell interpretation

#### Scenario: Darwin owner disappears
- **WHEN** the authenticated launch owner exits or disconnects while its Darwin process group remains live
- **THEN** A1 SHALL perform bounded group cleanup and SHALL preserve unrelated launch instances

#### Scenario: Darwin root exits normally
- **WHEN** the contained root process exits
- **THEN** the guardian SHALL clean remaining members of that owned process group, restore prior terminal foreground ownership when applicable, and report the root outcome

#### Scenario: Darwin artifact is unsupported or inconsistent
- **WHEN** the packed addon manifest is unsupported, names the wrong platform or architecture, or does not match the addon bytes
- **THEN** launch SHALL fail before creating a launch instance and SHALL NOT downgrade to uncontained execution

### Requirement: Native process identity inspection reports only active process objects
A1's native process inspector SHALL emit a process identity only when the exact opened operating-system process object is observed active. The inspector SHALL obtain that observation by loading the verified native addon in-process rather than by executing a helper. The identity SHALL include the process ID and stable creation token needed to distinguish PID generations. A terminated-but-queryable process object and a nonexistent PID SHALL produce the established absent/dead outcome without identity output. Permission denial, unsupported access, wait failure, and identity-query failure SHALL remain diagnosable inspection errors and SHALL NOT be converted into proof that a process is either live or dead.

#### Scenario: Inspect an active process repeatedly
- **WHEN** the Windows inspector inspects the same active process more than once
- **THEN** every successful result SHALL report the same PID and creation token
- **AND** each result SHALL be derived from a process object observed active during that inspection

#### Scenario: A terminated process object remains queryable
- **WHEN** a Windows process has terminated but another handle keeps its process object available for creation-time queries
- **THEN** inspection SHALL report the established absent/dead outcome with no identity
- **AND** queryable creation metadata alone SHALL NOT make the process live

#### Scenario: Inspection lacks authority or fails
- **WHEN** A1 cannot acquire the required state-and-identity access or a Windows wait or identity API fails
- **THEN** inspection SHALL fail with a concise diagnosable error
- **AND** reconciliation SHALL preserve ownership uncertainty rather than silently treating the process as active, dead, or safe to terminate

#### Scenario: A PID is reused
- **WHEN** a later process receives the numeric PID of an earlier process
- **THEN** its creation token SHALL differ from the earlier process identity
- **AND** state observation and token retrieval within one inspection SHALL refer to the same opened process object
