## ADDED Requirements

### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate the server, holders, or tab processes. Resident binaries and tab processes SHALL run from immutable release directories, and every release used by a live verified resident process SHALL be retained; when a recorded resident identity cannot be verified or read, its release SHALL be retained. In this version a same-generation newer client MAY attach with unsupported optional operations disabled, while the existing resident cohort remains on its release until all tabs stop. A generation mismatch SHALL report that the host must be stopped explicitly with `a1 tabs host stop`, SHALL use the direct single-agent path for that launch, and SHALL NOT kill or recycle tabs. Automatic endpoint handoff and idle release recycling require a later change.

#### Scenario: Update mid-turn
- **WHEN** `a1 update` runs while a tab streams
- **THEN** the turn and resident process identities SHALL remain uninterrupted and their immutable release SHALL remain retained

#### Scenario: Newer client with a different generation
- **WHEN** bare `a1` from a newer release reaches a resident server of another protocol generation
- **THEN** A1 SHALL print one notice naming `a1 tabs host stop`, run the direct single-agent path, and leave every resident process running

#### Scenario: Recorded resident identity cannot be inspected
- **WHEN** release cleanup cannot read a resident registry or verify a recorded process identity
- **THEN** every release that registry records SHALL be retained

### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide `a1 tabs` to list tabs with identity, name, status, and cwd; `a1 tabs stop <id>` and `a1 tabs stop --all`; `a1 tabs host status` and `a1 tabs host stop`, which stops tabs gracefully before the server; and `a1 tabs doctor`, which creates a bounded redacted diagnostic bundle. These commands SHALL NOT start an interactive runtime, SHALL NOT start a server merely to report that none runs, SHALL verify the terminal-host artifact before executing it, and SHALL fail concisely with nonzero status on invalid arguments. The doctor bundle SHALL exclude secrets, tokens, derived credentials, environment values, prompt journals, draft checkpoints, last-screen snapshots, the private child-stderr recovery sink, and terminal content.

#### Scenario: List with no server
- **WHEN** the user runs `a1 tabs` and no server runs
- **THEN** A1 SHALL report no running tabs and SHALL NOT start a server

#### Scenario: Stop one tab
- **WHEN** the user runs `a1 tabs stop <id>` for a working tab
- **THEN** that tab's child SHALL receive a graceful shutdown before bounded verified termination, the tab SHALL be removed, its session SHALL remain resumable, and other tabs SHALL be unaffected

#### Scenario: Stop the host while the server is unresponsive
- **WHEN** the user runs `a1 tabs host stop` and the identity-verified server does not answer within its deadline
- **THEN** A1 SHALL terminate only that verified server, stop the surviving holders gracefully, and leave no resident process running

#### Scenario: Doctor bundle with sensitive recovery data present
- **WHEN** the user runs `a1 tabs doctor` while journals, last screens, and content in the private child-stderr sink exist
- **THEN** the bundle SHALL contain structured logs, crash records, host status, and redacted registry data, and SHALL contain none of the excluded data

#### Scenario: Invalid arguments
- **WHEN** the user runs `a1 tabs stop` with no id and no `--all`
- **THEN** A1 SHALL print one concise diagnostic, exit nonzero, and perform no I/O against resident processes

### Requirement: Host status reports resident identity and health
`a1 tabs host status` SHALL report the server id, process id, build, release, protocol generation, epoch, uptime, observed detachment mode and any detachment verification failure reason, tab count by status, client count, the configured and hard limits, and the paths of the structured logs. It SHALL also report counters since server start for crash restarts, failed tabs, hang recoveries, unresponsive and stalled transitions, full-surface resyncs, and persistence, checkpoint, and bridge degradation. Counters SHALL be volatile and SHALL NOT contain prompt text, terminal content, or credentials.

#### Scenario: Status after a tab restart
- **WHEN** one tab crashed and restarted since the server started
- **THEN** `a1 tabs host status` SHALL show one crash restart and the server's detachment mode

#### Scenario: Status with no server
- **WHEN** the user runs `a1 tabs host status` and no server runs
- **THEN** A1 SHALL report that no host runs, exit successfully, and SHALL NOT start a server

### Requirement: An idle resident server exits after ten minutes
The resident server SHALL exit after ten minutes with no attached client and no user tab with a live holder. A prewarmed standby tab SHALL NOT keep the server alive; the server SHALL stop it before exiting. The server SHALL remove its endpoint and owner marker only while both still identify it.

#### Scenario: Only a standby tab remains
- **WHEN** every user tab is closed, no client is attached, and ten minutes pass
- **THEN** the server SHALL stop the standby tab, remove its own endpoint and marker, and exit

#### Scenario: Client returns before the deadline
- **WHEN** a client attaches before the ten-minute interval ends
- **THEN** the server SHALL stay running and restart the interval only after it is idle again

### Requirement: Preview support is packaged, opt-in, certified, and reversible
The terminal-host binary SHALL ship for Windows x64, macOS, and Linux with artifact hashes, pinned source provenance, licenses, notices, and immutable-release placement verified before execution. A release SHALL NOT be packed unless every supported platform's terminal-host artifact and manifest are present. `residentTabs` SHALL remain `false` by default on every platform in this change and SHALL be accepted as an opt-in preview on each platform only after exact-package automated suites and manual or isolated-worker physical evidence on that platform for terminal closure, remote-session loss, forced attach-client termination, reattach, input fidelity and rendering, extension text UI, two-client attribution, server, holder, and child failure, sensitive-data separation, and conflict-safe direct rollback. Physical automation SHALL NOT run on an active workstation. When the terminal-host artifact is missing, altered, incompatible, or unsupported, bare `a1` SHALL run the direct single-agent owned UI with one notice; registry records and sessions SHALL be preserved. Default-on support on any platform and each additional platform require separate approved changes and evidence.

#### Scenario: Server cannot start
- **WHEN** the terminal-host binary is missing, unverified, or fails its start budget
- **THEN** bare `a1` SHALL use the direct single-agent path with one notice, preserving records and applying the shared writer-lease check to any selected session rather than bypassing a live writer

#### Scenario: Altered terminal-host artifact
- **WHEN** the terminal-host executable in an installed release does not match its manifest hash or size
- **THEN** A1 SHALL NOT execute it and SHALL use the direct single-agent path with one notice

#### Scenario: Platform without recorded physical evidence
- **WHEN** automated suites pass on a platform but its physical acceptance record lacks a verdict for any required item
- **THEN** the preview SHALL remain documented as uncertified on that platform and evidence from another platform SHALL NOT be used in its place

#### Scenario: Roll back with tabs running
- **WHEN** the user sets `residentTabs` to `false` while tabs run and then opens a session held by a tab
- **THEN** bare `a1` SHALL run the direct path, SHALL NOT write the held session, and the resident tabs SHALL keep running until `a1 tabs host stop`
