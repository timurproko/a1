## ADDED Requirements

### Requirement: Exact live sessions report exit readiness

The version-1 integration protocol SHALL expose a `session.lifecycle` operation for an exact `session` target. The owning runtime SHALL answer with its current lifecycle state, whether the editor is empty, the number of waiting submissions, the number of queued engine inputs, whether an overlay, dialog or selector is open, a computed `exitAdmissible` boolean and an ordered `blockers` list drawn from `session-busy`, `editor-not-empty`, `pending-input`, `overlay-open` and `session-stopping`. The snapshot SHALL be read-only: it SHALL NOT clear drafts or queued input, dismiss overlays, interrupt a turn or change any setting. Whitespace-only draft text SHALL count as a non-empty editor. Before the shell exists or after disposal the operation SHALL fail with `session-unavailable`. Capability discovery SHALL report `lifecycle: true` only when both lifecycle operations are implemented, and SHALL keep every existing operation and flag unchanged.

#### Scenario: Idle session with an empty editor
- **WHEN** a host requests `session.lifecycle` for an exact live session whose lifecycle is ready, editor is empty, nothing is waiting or queued and no overlay is open
- **THEN** the response SHALL report `exitAdmissible: true` with an empty `blockers` list
- **AND** no session state SHALL change

#### Scenario: Busy session with a draft and queued input
- **WHEN** a host requests `session.lifecycle` while a model turn runs, the editor holds text and a follow-up is queued
- **THEN** the response SHALL report `exitAdmissible: false` with `session-busy`, `editor-not-empty` and `pending-input` in that order
- **AND** the draft, queue and turn SHALL remain untouched

#### Scenario: Discovery stays additive
- **WHEN** a host invokes `capabilities` on an installation with these operations
- **THEN** it SHALL receive the existing operations and flags plus `session.lifecycle`, `session.exit` and `lifecycle: true`

### Requirement: Graceful exit is admitted atomically and acknowledged once

The protocol SHALL expose a `session.exit` operation for an exact `session` target. Inside the runtime's serialized request handler, with no asynchronous gap between the check and the admission, the runtime SHALL re-evaluate readiness and admit the exit only when no blocker is present. Admission SHALL run the same shutdown path as `/quit`, SHALL be acknowledged with `status: "admitted"` and `lifecycle: "stopping"` before shutdown proceeds far enough to close the transport, and SHALL happen at most once per session. A refused request SHALL return the first blocker as its error code and SHALL NOT clear drafts, discard queued input, dismiss overlays, interrupt a turn or terminate the process. A request arriving after admission SHALL fail with `session-stopping`. Requests on a disposed, stopped, replaced or mismatched target SHALL fail with the existing transport errors. This change SHALL provide no forced-exit option.

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
- **THEN** the host SHALL treat the outcome as unknown and read `session.lifecycle` or its own host facts
- **AND** the runtime SHALL NOT apply the expired request to a later or replacement session

### Requirement: Exit acknowledgement is admission, not exit proof

Documentation and the acknowledgement shape SHALL state that an admitted exit means shutdown has started in the exact runtime, not that the process has exited, the terminal is free or any worktree is released. Supervisors SHALL verify exit through their own host facts, such as Herdr Core terminal state, before archiving, replacing or tearing down resources. The documented consumer flow SHALL use the native `a1.session` and `a1.runtime` labels as the exact target and a literal argument array for `a1 api`.

#### Scenario: Supervisor verifies exit independently
- **WHEN** Firstmate receives an admitted `session.exit` acknowledgement for a worker terminal
- **THEN** it SHALL wait for the terminal's program to exit according to Core before treating the worker as stopped
- **AND** a surviving program after the bounded wait SHALL be reported as unknown rather than stopped
