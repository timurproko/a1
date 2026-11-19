## ADDED Requirements

### Requirement: A streaming tool execution costs frames, not chunks
While a tool execution streams output, the owned shell SHALL bound its work by the frame
cadence rather than by the number of output chunks the engine reports. Partial results
that arrive faster than a frame SHALL be coalesced so that only the newest accumulated
output per tool call is applied, and the work performed to apply one partial SHALL NOT
re-serialize or re-summarize the whole accumulated output. A tool execution's final
result SHALL supersede any partial still waiting, and SHALL be applied without waiting
for the coalescing interval.

Applying one streamed block SHALL invalidate only that block's rendered state; the other
components' caches SHALL survive the chunk. Reading the view during a stream SHALL NOT
recompute derived session aggregates (usage, context, subscription state) per chunk;
they SHALL be recomputed only when an event that can change them arrives.

#### Scenario: Shell stays live under a heavy command
- **WHEN** the agent executes a command that streams output faster than the frame
  interval for many seconds
- **THEN** typed input SHALL be accepted and echoed while the command runs
- **AND** timed indicators SHALL keep animating for the duration of the command

#### Scenario: Chunks outnumber frames
- **WHEN** many partial results for one tool call arrive within one coalescing interval
- **THEN** the shell SHALL apply only the newest of them
- **AND** the intermediate partials SHALL NOT each pay the event pipeline's full cost

#### Scenario: The end of a tool execution is immediate
- **WHEN** a tool execution ends while a coalesced partial is still waiting
- **THEN** the final result SHALL be applied immediately and the waiting partial SHALL be
  discarded rather than applied afterwards
- **AND** flushing the adapter's events SHALL deliver any coalesced partial that has not
  yet been applied, so a caller that flushes observes the newest output

#### Scenario: A partial result is not summarized
- **WHEN** a partial tool result restates the accumulated output
- **THEN** the shell SHALL render it from the block's text
- **AND** a serialized summary of the result SHALL be produced only when the execution
  ends
