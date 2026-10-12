## ADDED Requirements

### Requirement: Slow clients never stall tabs
Each client connection SHALL have a bounded reliable control lane and a single-slot render lane in which newer surface updates replace unsent ones. A client that falls behind SHALL receive a full surface once it drains. A client whose control lane overflows SHALL be disconnected with a typed reason rather than have individual control messages dropped. The server SHALL stream surface updates for a tab only to clients that view it. The server SHALL NOT block holders, other clients, or registry writes on a slow client, and holders SHALL NOT block children on output.

#### Scenario: Suspended terminal
- **WHEN** one attached terminal stops reading while tabs stream
- **THEN** tabs and other clients SHALL continue normally and the stalled client SHALL show the current surface when it resumes

#### Scenario: Control lane overflows
- **WHEN** a stalled client's control lane reaches its bound
- **THEN** the server SHALL close only that connection with a typed overrun reason, and the client SHALL reconnect and receive a full topology snapshot

#### Scenario: Unviewed tab streams output
- **WHEN** a tab produces output while no client views it
- **THEN** its holder SHALL keep parsing the output and no client SHALL receive surface updates for that tab

### Requirement: The server heals itself without losing tabs or creating split brain
When the server exits unexpectedly, attach clients SHALL show a non-blocking reconnecting indication, and any client or holder MAY start a replacement through the verified detached recovery path, with starts serialized so that at most one replacement start is in flight per profile. The replacement SHALL acquire the released writer lease, increment the durable epoch, derive expected holder credentials, verify native identities and incarnations, and re-admit surviving holders with their holder and child process identities unchanged. Tabs whose holders are gone or unverifiable SHALL leave the live set without a second writer being started for their session. A live recorded owner SHALL be terminated only after exact identity verification, and an unverifiable owner or unavailable lease SHALL block replacement. After three starts within sixty seconds, clients SHALL show a stopped state with restart and quit actions, and holders and children SHALL keep running.

#### Scenario: Server killed with no client attached
- **WHEN** the server dies while no terminal runs `a1`
- **THEN** a holder SHALL start the replacement, and the next `a1` SHALL reattach every tab with its current screen

#### Scenario: Server killed with two tabs
- **WHEN** the server is killed while two tabs stream and a client is attached
- **THEN** the replacement SHALL re-admit both holders, each holder and child SHALL keep its pid and native start identity, and the client SHALL show each tab's current surface after reconnecting

#### Scenario: Start budget exhausted
- **WHEN** the server has been started three times within sixty seconds and exits again
- **THEN** clients SHALL show the stopped state with restart and quit actions, no further automatic start SHALL occur, and every holder and child SHALL keep running

#### Scenario: Replacement races
- **WHEN** a client and a holder request a replacement at the same time
- **THEN** exactly one replacement SHALL start and the other requester SHALL join it
