## MODIFIED Requirements

### Requirement: Graceful exit is admitted atomically and acknowledged once

The protocol SHALL expose a `session.exit` operation for an exact `session` target. Inside the runtime's serialized request handler, with no asynchronous gap between the check and the admission, the runtime SHALL re-evaluate readiness and admit the exit only when no blocker is present. Admission SHALL run the same shutdown path as `/quit`, SHALL be acknowledged with `status: "admitted"` and `lifecycle: "stopping"` before shutdown proceeds far enough to close the transport, and SHALL happen at most once per session. The acknowledgement SHALL mean only that shutdown has started in the exact runtime; it SHALL NOT assert that the process has exited. A refused request SHALL return the first blocker as its error code and SHALL NOT clear drafts, discard queued input, dismiss overlays, interrupt a turn or terminate the process. A request arriving after admission SHALL fail with `session-stopping`. Requests on a disposed, stopped, replaced or mismatched target SHALL fail with the exact-target transport errors. The protocol SHALL provide no forced-exit option.

#### Scenario: Supervisor retires an idle worker
- **WHEN** a host requests `session.exit` for an exact live session that is ready with an empty editor and nothing pending
- **THEN** the response SHALL acknowledge `status: "admitted"` and `lifecycle: "stopping"`
- **AND** the session SHALL stop through the ordinary quit path as if the person had used `/quit`

#### Scenario: Refuse while anything would be lost
- **WHEN** a host requests `session.exit` while the editor holds text, a submission is waiting, input is queued, an overlay is open or a turn is running
- **THEN** the response SHALL fail with the corresponding blocker code
- **AND** the session SHALL remain exactly as it was

#### Scenario: Concurrent exit requests admit once
- **WHEN** two hosts request `session.exit` for the same admissible session at the same time
- **THEN** exactly one request SHALL be acknowledged as admitted
- **AND** the other SHALL fail with `session-stopping`

#### Scenario: Lost acknowledgement is not retried blindly
- **WHEN** a host's `session.exit` request times out or the connection closes before a response
- **THEN** the runtime SHALL NOT apply the expired request to a later or replacement session

## REMOVED Requirements

### Requirement: Consumer validates completion identity
**Reason**: It specified how an integration client and the Herdr plugin must behave. Those consumers live outside this repository, so nothing here implements or checks the rule.
**Migration**: None in this repository. The response envelope a client validates is stated by "One bounded versioned public integration boundary".

### Requirement: Exit acknowledgement is admission, not exit proof
**Reason**: It specified documentation wording and what supervisors such as Firstmate must do after an acknowledgement, which is consumer behavior outside this repository.
**Migration**: The meaning of the acknowledgement is stated in "Graceful exit is admitted atomically and acknowledged once".
