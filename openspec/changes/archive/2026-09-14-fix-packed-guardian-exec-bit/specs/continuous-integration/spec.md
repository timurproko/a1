## ADDED Requirements

### Requirement: Exact packages carry a spawn-capable native process guardian
The exact packed package SHALL record each bundled platform's native process guardian with an executable file mode, regardless of which operating system packed it, so that posix installation and immutable release materialization preserve a spawn-eligible helper. Packing SHALL derive each guardian entry's executability from the per-platform guardian build manifest packed beside the binary, not from the pack host's filesystem permissions. Exact package surface validation SHALL assert every packed native guardian entry is executable on every lane that runs it, including lanes whose host cannot represent posix permissions. Executable mode SHALL NOT override the manifest's independent supported/unsupported capability decision.

#### Scenario: Packed on a host without posix permissions
- **WHEN** the exact package is packed on a host whose filesystem cannot record posix executable permission
- **THEN** the packed native process guardian entries for every bundled platform SHALL still carry an executable mode

#### Scenario: Executability is bound to certified build bytes
- **WHEN** packing records a native process guardian entry as executable
- **THEN** the entry bytes SHALL match the digest declared by that platform's guardian build manifest packed beside the binary

#### Scenario: Surface validation proves executability on any host
- **WHEN** exact package surface validation runs on any platform lane, including Windows
- **THEN** it SHALL fail unless every packed native process guardian entry is recorded executable

#### Scenario: Posix materialization preserves guardian executability
- **WHEN** the exact package is installed and materialized on Linux or Darwin
- **THEN** every bundled native guardian file SHALL remain executable
- **AND** a guardian whose manifest declares supported capability SHALL be spawn-eligible for the packaged public launch chain

#### Scenario: Executable artifact remains unsupported
- **WHEN** a bundled guardian has executable mode but its certified manifest declares the current platform unsupported
- **THEN** launch SHALL continue to reject that containment provider until a separate platform-capability change certifies it
