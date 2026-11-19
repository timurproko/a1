## MODIFIED Requirements

### Requirement: Resident roles launch outside terminal containment through a fixed path
The native terminal host SHALL start resident roles only through a launch primitive that accepts the canonical profile and a role from a fixed enum and resolves the hosting Node runtime executable and the release's fixed role entry itself, as recorded when the addon was loaded. The primitive SHALL accept no executable or free-form argv, SHALL use a fixed role argument grammar, explicit allowlisted environment and cwd, and non-inherited handles, and SHALL refuse an unverified profile, role, artifact, or result before spawning or reporting readiness. The launched process SHALL run outside the launching terminal's containment: outside the caller's kill-on-close job on Windows, using WMI when that job forbids direct breakaway, and after double-fork and `setsid` without a controlling terminal on Linux and macOS, remaining in the caller's per-user bootstrap namespace on macOS. The primitive SHALL verify launched process identity and containment, report its observed mode, and signal cleanup only for an exact verified identity. Ordinary descendants SHALL gain no generic escape path.

#### Scenario: Launching tree is killed
- **WHEN** a fixed resident fixture role was verified and its launching process tree is then killed, or on Linux and macOS its session is hung up
- **THEN** the resident fixture SHALL keep running with the same verified process identity

#### Scenario: Request names an arbitrary executable or argument
- **WHEN** a launch request supplies an executable, free-form argument, role, profile, or artifact outside the fixed contract
- **THEN** the primitive SHALL refuse it without spawning a process

#### Scenario: Launched role is the hosting runtime
- **WHEN** the primitive spawns a server or holder role
- **THEN** the spawned process image SHALL be the Node runtime that loaded the addon and its program SHALL be the release's fixed role entry
- **AND** no terminal-host executable SHALL be resolved or started

#### Scenario: Windows job forbids direct breakaway
- **WHEN** the verified launcher runs inside a synthetic kill-on-close Windows job that denies direct breakaway
- **THEN** it SHALL use the bounded WMI mode with the fixed runtime, entry, and arguments and SHALL report readiness only after identity and job-containment verification

#### Scenario: Ordinary child stays contained
- **WHEN** an ordinary child of the launching tree attempts to outlive that tree and the tree is killed
- **THEN** the ordinary child SHALL end with the tree

#### Scenario: Spawn result cannot be verified
- **WHEN** the primitive cannot verify the returned pid, start identity, session, process group, job membership, or controlling-terminal state required by that platform
- **THEN** it SHALL report failure and SHALL NOT claim resident readiness or signal an unverifiable process
