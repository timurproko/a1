## MODIFIED Requirements

### Requirement: Resident tabs make independent concurrent progress
Every resident Agent SHALL continue engine work, render scheduling, child animation state, PTY draining, retained terminal-state updates, and switch-time complete-surface production independently of which tab is viewed and independently of another tab's first response, input, rendering, lifecycle work, revision number, or slow client. Hidden Agents MAY suppress external surface delivery, but their children SHALL continue their normal render scheduling and their holders SHALL retain every output update in current terminal state. Selecting any working Agent SHALL expose a complete frame containing its newest committed partial reply and current animation phase, then continue presenting later partial frames and animation changes without waiting for that turn or another turn to settle. Selection SHALL NOT be required to resume execution or restart an animation. Execution, child rendering, and viewed presentation SHALL each make independently observable progress; one advancing status icon or a final answer SHALL NOT substitute for the other stages.

#### Scenario: Several agents stream simultaneously
- **WHEN** at least three resident Agents generate streamed replies at the same time and the user repeatedly switches before any reply settles
- **THEN** every selected Agent SHALL show successive partial reply states and live animation changes and continue advancing
- **AND** no Agent SHALL remain on its pre-run frame and then jump directly to final content

#### Scenario: Later Agent has a lower revision
- **WHEN** the first Agent has emitted more surface revisions than a later-created Agent
- **THEN** selecting the later Agent SHALL commit and continue its own revision sequence rather than discarding it as globally stale

#### Scenario: Lifecycle work overlaps active input
- **WHEN** tab create, close, Settings startup, restart, rename, reorder, recovery, or registry persistence overlaps input and streaming in another Agent
- **THEN** the unrelated Agent SHALL retain solo-equivalent input and presentation responsiveness

#### Scenario: One attached client is slow
- **WHEN** one client's replaceable surface lane cannot drain while multiple Agents continue working
- **THEN** no child, holder, other client, or lifecycle-independent input path SHALL wait for that client
- **AND** the slow lane SHALL eventually receive one newest complete surface rather than replaying a catch-up burst

#### Scenario: First response order does not select the only live Agent
- **WHEN** three Agents begin overlapping turns and any one of them produces its first response before the other two
- **THEN** each Agent SHALL continue independent engine and child-render progress regardless of response order
- **AND** activating either later responder SHALL show its current unfinished response and ongoing updates without waiting for the first Agent to finish

#### Scenario: Hidden animation remains current
- **WHEN** a working Agent remains hidden while other Agents stream and its normal child animations advance
- **THEN** its engine, renderer, and retained terminal state SHALL keep advancing
- **AND** selecting it SHALL present its current animation phase and continue animation rather than replaying old frames or restarting a frozen phase

#### Scenario: No viewer remains attached
- **WHEN** every attach client disconnects while several Agents have unfinished turns
- **THEN** all Agents SHALL continue engine work, child rendering, and retained-state updates
- **AND** reattachment SHALL reveal current committed content without a catch-up replay or an execution-resume action

#### Scenario: Type while another Agent floods output
- **WHEN** one Agent emits high-rate output while the user activates another working Agent and types into its prompt
- **THEN** the input SHALL be delivered exactly once to the activated Agent and its visible echo and animations SHALL progress without waiting for the flood to finish

#### Scenario: Requested target changes while first input waits
- **WHEN** first input is pending behind a controller handoff and the requested target is cancelled, fails, or is superseded
- **THEN** admitted input SHALL retain its original target and controller identity or receive the established explicit rejection or uncertain-delivery outcome
- **AND** it SHALL not be silently retargeted to the previously visible Agent or replayed into a surviving tab

#### Scenario: Server reconnects while no viewer is attached
- **WHEN** all viewers are detached and a server reconnect overlaps unfinished turns
- **THEN** each child SHALL continue engine/render progress and its holder SHALL continue parsing and retaining committed content during reconnect
- **AND** a later viewer SHALL obtain current partial content and live continuation without restarting the Agent
