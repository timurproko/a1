## ADDED Requirements

### Requirement: Restart-readiness observation is independent of release discovery
Every interactive published A1 process SHALL compare its executing immutable release with the locally recorded approved active release on a bounded short cadence. This local comparison SHALL not require a registry request, a successful dist-tag lookup, ownership of the automatic-update worker, or evidence that the process launched the active release. When the active release is valid semver, belongs to the executing release's channel, and is newer, the process SHALL report restart readiness and stop polling after that result. Unreadable, malformed, unapproved, same-version, older, source-checkout, and cross-channel state SHALL not produce restart readiness.

The local comparison SHALL remain available when update discovery is `Notify` or `No`, when registry lookup fails, and when network-oriented version checks are disabled, because it reads only already-committed local release state and starts no update. Disposal SHALL cancel the local observer. Registry discovery, automatic installation eligibility, and their existing opt-outs SHALL otherwise remain unchanged.

#### Scenario: Another process activates the update
- **WHEN** one process activates an approved same-channel release newer than several still-running A1 processes
- **THEN** every older process containing this behavior SHALL report restart readiness within the bounded local observation interval
- **AND** none SHALL need to have launched, discovered, or installed the active version itself

#### Scenario: Registry discovery fails
- **WHEN** an older process cannot fetch or parse its channel dist-tag but the local approved active release is newer on the same channel
- **THEN** it SHALL still report restart readiness from local state
- **AND** the failed discovery SHALL start no additional update

#### Scenario: Update discovery is disabled
- **WHEN** a published older process uses `Notify` or `No`, or a network version-check opt-out applies, while a newer same-channel approved release is already active locally
- **THEN** the process SHALL report restart readiness without reading the release cache or contacting the registry

#### Scenario: Local state does not prove staleness
- **WHEN** local release state is missing, unreadable, malformed, unapproved, equal, older, cross-channel, or compared with an unpublished executing version
- **THEN** A1 SHALL show no restart readiness and SHALL perform no mutation
