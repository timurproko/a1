## ADDED Requirements

### Requirement: Installed interactive startup is measurable and bounded
A1 SHALL measure invocation-to-first-usable-frame startup without changing normal terminal output. A first usable frame means the selected owned UI has painted and its editor accepts input. On the accepted Windows release runner, the first `a1` or `a1 pi` launch after a completed exact-package update or after loss of the active release's live supervisor SHALL reach that state within 5 seconds, and a subsequent warm launch SHALL reach it within 3 seconds.

#### Scenario: Launch follows a successful update
- **WHEN** the exact packaged updater reports success and the user starts either supported interactive profile on the accepted Windows release runner
- **THEN** the selected UI SHALL paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch follows supervisor loss or machine restart
- **WHEN** an approved active release remains installed but its previously verified supervisor is absent or dead after process loss, sign-out, or machine restart
- **THEN** either supported interactive profile SHALL validate the selected immutable content and paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch uses warmed immutable content
- **WHEN** the same active release has already completed one interactive startup or update warmup on the accepted Windows release runner
- **THEN** another supported interactive launch SHALL paint an input-ready frame within 3 seconds

#### Scenario: Startup tracing is enabled
- **WHEN** an isolated diagnostic run explicitly enables startup timing evidence
- **THEN** A1 SHALL report bounded durations for bootstrap, durable release validation, supervisor startup, guardian startup, UI module loading, Pi services, resource loading, session creation, and first render without exposing credentials or prompt/session content

#### Scenario: Startup tracing is not enabled
- **WHEN** the user performs an ordinary interactive launch
- **THEN** A1 SHALL not print startup timing detail or an additional loading transcript
