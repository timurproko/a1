## ADDED Requirements

### Requirement: Native resident clients observe committed update activation

A resident attach client SHALL independently observe bounded local release-cohort state after it has painted. When the approved active release is newer and in the same channel as the immutable attach-client package, it SHALL show `Update installed, restart to update` in native chrome and stop observing. It SHALL fail closed without exposing release diagnostics or mutating release, registry, or Agent state. A restarted successor whose installed-update state matches its package SHALL not repeat the notice.

#### Scenario: A predecessor Agent lacks JavaScript observation

- **WHEN** a retained Agent still runs code from an older release and a newer approved same-channel release becomes active
- **THEN** its native attach client SHALL show `Update installed, restart to update` within the bounded observation interval
- **AND** the Agent's holder and child identities SHALL remain unchanged

#### Scenario: The successor reconnects

- **WHEN** the user restarts into the installed successor release
- **THEN** the successor SHALL reconnect to the retained Agent without replaying input or replacing its execution identities
- **AND** it SHALL not show a satisfied restart notice

#### Scenario: State is not trusted

- **WHEN** release state is unreadable, malformed, unapproved, equal, older, or cross-channel
- **THEN** the attach client SHALL not show restart readiness or mutate local state
