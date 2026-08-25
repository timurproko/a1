## ADDED Requirements

### Requirement: Streaming output does not cost the shell its responsiveness
The owned shell SHALL remain responsive while the agent streams. The work it performs for
one engine event SHALL NOT grow with the number of transcript blocks already present, and
engine events SHALL be delivered so the runtime's event loop turns between batches rather
than after the burst has drained. Typed input SHALL be serviced while output arrives, and
a pending frame SHALL NOT delay it. Rendering SHALL be coalesced to the runtime's frame
interval rather than performed once per streamed update.

A transcript block that has not changed SHALL NOT be re-rendered to produce a frame, and
locating the block an event refers to SHALL NOT scan the transcript.

#### Scenario: Type while the agent streams
- **WHEN** the user types, submits, or invokes a command while the agent is streaming output
- **THEN** the keystroke SHALL be accepted and shown without waiting for streaming to stop

#### Scenario: Stream into a long transcript
- **WHEN** the agent streams into a session that already holds a large transcript
- **THEN** the work performed per streamed update SHALL be equivalent to the work performed
  for the same update in an empty session
- **AND** the shell SHALL NOT become progressively less responsive as the session grows

#### Scenario: Timed indicators keep running
- **WHEN** an indicator animates on a timer while the agent streams
- **THEN** it SHALL continue to animate rather than stalling until the run ends

#### Scenario: Pointer input during streaming
- **WHEN** the terminal reports pointer input while the agent streams
- **THEN** it SHALL be handled at the time it arrives rather than after the run ends

### Requirement: Working state is cleared only by the event that ends the work
The owned shell SHALL treat entering a working, retrying, or compacting state and leaving
it as separate transitions, each ended only by the event that ends that work. An event that
reports the agent settling, a retry finishing, or a compaction finishing while the turn
continues SHALL NOT clear a state it did not start, and SHALL NOT be reported as the session
becoming idle. Where the engine states that work continues after the event, the shell SHALL
honor that statement rather than discarding it.

Clearing SHALL be scoped to the state being cleared, so ending one kind of work leaves any
other kind still standing.

#### Scenario: Agent settles inside a run
- **WHEN** the engine reports the agent settling while the run continues
- **THEN** the working indicator SHALL remain as it was and the session SHALL NOT be
  reported as idle

#### Scenario: Automatic compaction inside a turn
- **WHEN** compaction starts and finishes while the turn continues
- **THEN** the compaction indicator SHALL be shown for its duration and removed at its end
- **AND** the working state SHALL be the one shown once compaction ends, without waiting for
  a further prompt

#### Scenario: Automatic retry inside a turn
- **WHEN** a retry starts and finishes while the turn continues
- **THEN** the retry indicator SHALL be removed at its end and the working state SHALL stand

#### Scenario: Turn ends
- **WHEN** the engine reports the turn ending without a further attempt
- **THEN** the working state SHALL be cleared and the session SHALL be reported as ready

#### Scenario: Content continues after a cleared indicator
- **WHEN** transcript content is still arriving
- **THEN** the shell SHALL NOT present the session as idle
