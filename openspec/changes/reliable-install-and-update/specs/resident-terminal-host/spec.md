## MODIFIED Requirements

### Requirement: Resident host primitives identify processes, boots, and OS sessions exactly
The native terminal host SHALL identify a process by its pid together with its native start time on Windows x64, Linux x64, and macOS arm64, and SHALL treat a process whose start time differs from the recorded one as unrelated. It SHALL report a native-precision boot identity that changes on reboot and remains stable within one boot, and an OS-session identity that distinguishes a later login session without using rounded wall-clock inference. An unavailable or malformed identity source SHALL produce a typed failure rather than a guessed identity.

On macOS the boot identity SHALL derive from the kernel boot-session UUID, which wall-clock corrections do not change. Every boot-identity comparison SHALL use one shared matching rule instead of string equality: equal current-form identities match, and a legacy `macos-boot:<seconds>:<microseconds>` record SHALL match the current boot when its seconds lie within two seconds of the current kernel boot time. A record that matches neither SHALL be treated as another boot.

#### Scenario: Process identifier reuse
- **WHEN** a recorded pid now belongs to a process with a different start time
- **THEN** the primitive SHALL report the recorded process as gone and SHALL NOT identify, adopt, or signal the new process as it

#### Scenario: Stable boot and OS session
- **WHEN** boot and OS-session identities are read twice without a reboot or new login between them
- **THEN** each pair of reads SHALL return the same identity

#### Scenario: The macOS clock is corrected within one boot
- **WHEN** the wall clock is stepped after a resident host recorded its boot identity
- **THEN** the boot identity read afterwards SHALL still match the recorded one
- **AND** continuity, workspace, and attach checks SHALL NOT treat the host as belonging to another boot

#### Scenario: A host recorded a legacy boot identity
- **WHEN** a running host's registry holds `macos-boot:<seconds>:<microseconds>` whose seconds are within two seconds of the current kernel boot time
- **THEN** a newer client SHALL treat that host as belonging to the current boot

#### Scenario: The machine rebooted
- **WHEN** a recorded boot identity comes from a previous boot
- **THEN** the matching rule SHALL report another boot

#### Scenario: Identity source is malformed
- **WHEN** the platform identity source returns incomplete or malformed data
- **THEN** the primitive SHALL report identity unavailable and SHALL NOT synthesize a pid-only or rounded-time identity
