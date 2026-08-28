## MODIFIED Requirements

### Requirement: Uncertified development previews are explicit
A preview published under npm tag `next` SHALL pass the fast tier, architecture
checks, and exact packed-candidate gates (package content, clean install, dependency
policy) on every supported platform. The complete suite is not required for a
preview. A preview SHALL NOT move `latest`, and SHALL NOT claim certified terminal
parity or platform support.

Preview publication SHALL follow from a push rather than from manual acceptance:
what makes a commit publishable is that it passed the required development check
before it landed.

#### Scenario: Physical workers are unavailable
- **WHEN** a commit passes the required development check, merges, and no physical certification exists for it
- **THEN** its preview MAY publish without further acceptance, as an explicitly uncertified development preview

#### Scenario: Stable publication is requested
- **WHEN** a version would move `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version bytes on every supported platform first

### Requirement: Stable transparent acceptance uses independent physical evidence
Claims of certified terminal parity or platform support SHALL rest on comparing
transparent rendering, character presentation, input identity, selection, clipboard,
scrollback, mouse, resize, modes, latency, exit, and restoration against direct
execution through actual supported host-terminal behavior. A test encoder, emulator,
or A1 terminal model SHALL NOT be the sole oracle.

Physical evidence governs what A1 may claim, not whether a version may be published.
Where no physical evidence exists for a platform, that platform SHALL remain
uncertified and A1 SHALL NOT represent it as supported — and a release MAY still
publish, because withholding releases for evidence no machine produces protects
nobody.

#### Scenario: Physical certification is attempted
- **WHEN** direct and transparent workloads are compared on a supported platform
- **THEN** evidence SHALL originate from isolated native host actions, child effects, physical observations, exact process identity, and exact packaged bytes

#### Scenario: One generic workload fails
- **WHEN** Native Pi passes but another application-independent workload exposes a terminal difference
- **THEN** the capability and platform SHALL remain uncertified

#### Scenario: No physical worker exists
- **WHEN** a platform has no physical evidence at all
- **THEN** that platform SHALL remain uncertified and unclaimed, and publication SHALL NOT be blocked on it
