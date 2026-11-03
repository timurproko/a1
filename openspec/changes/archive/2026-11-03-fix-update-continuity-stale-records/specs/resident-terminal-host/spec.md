## ADDED Requirements

### Requirement: Continuity discovery distinguishes dead historical debris from live resident authority
Resident source discovery SHALL establish the liveness of a historical owner record from its exact recorded native process identity before requiring fields introduced by the current owner schema. A record MAY be omitted from continuity topology only when a valid recorded PID and native start identity prove that exact process is gone or that the PID now belongs to a different process. Omission SHALL NOT delete, rewrite, adopt or signal the record or its directory.

A live recorded process, unavailable native identity inspection, malformed or missing minimal identity, or any other outcome that does not prove exact-process death SHALL remain fail-closed. Such a record SHALL still require the complete supported owner schema and all existing profile, release, namespace, credential, epoch and compatibility checks before it can participate in a source route. This rule SHALL NOT execute or migrate an obsolete private contract.

#### Scenario: Dead legacy debris exists beside a supported live source
- **WHEN** one profile contains a supported live predecessor owner and a legacy owner missing modern release fields whose exact recorded process is provably gone
- **THEN** continuity discovery SHALL omit only the dead legacy owner and SHALL retain the supported live source as compatible
- **AND** it SHALL NOT modify or signal either source record

#### Scenario: A legacy owner is still live
- **WHEN** an owner lacks the current schema but its exact recorded process remains live
- **THEN** discovery SHALL refuse continuity rather than omit, adopt, migrate or terminate that owner

#### Scenario: Historical liveness cannot be established
- **WHEN** an owner record lacks a valid minimal PID/start identity or native inspection is unavailable or inconclusive
- **THEN** discovery SHALL preserve the blocking uncertainty and SHALL NOT interpret the record as dead

#### Scenario: The PID was reused
- **WHEN** the recorded PID now has a different native start identity
- **THEN** discovery MAY omit the historical owner as gone
- **AND** SHALL NOT inspect, adopt or signal the unrelated process now using that PID

#### Scenario: A current owner names the wrong profile
- **WHEN** a complete current owner is live but its profile or namespace does not match the requested continuity scope
- **THEN** existing exact-scope checks SHALL refuse it rather than treating schema validity or liveness as route authority
