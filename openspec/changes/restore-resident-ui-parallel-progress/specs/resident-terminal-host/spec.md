## ADDED Requirements

### Requirement: Resident publication respects child visual transactions
A valid child synchronized-output transaction SHALL not become visible as separate clear, partial repaint, and final repaint states merely because its bytes arrive in separate transport reads. Retained parsing and terminal query responses SHALL continue during the transaction, while normal presentation uses the previous committed visual state until completion. Subscription and reconnect SHALL observe committed state rather than a half-written transaction. A malformed or unfinished transaction SHALL have bounded local recovery that does not block another tab. The final outer presentation SHALL have one synchronization envelope whose end follows all child, overlay, mode, and cursor changes; nested mode markers SHALL NOT end it early.

#### Scenario: Child paint arrives in installments
- **WHEN** a synchronized clear-and-repaint is split across reads, including splits inside its control sequences
- **THEN** the previous committed screen SHALL remain presented until the replacement transaction is complete
- **AND** the clear or partially repainted child SHALL NOT be published as a completed normal frame

#### Scenario: Subscribe during an open transaction
- **WHEN** a client requests a tab while that child is halfway through a synchronized repaint
- **THEN** the response SHALL use a committed surface or preserve the prior coherent view until the new committed surface is available
- **AND** terminal query responses and other tabs SHALL continue independently

#### Scenario: Transaction never ends
- **WHEN** a child's synchronized transaction remains unfinished beyond the declared recovery bound
- **THEN** recovery SHALL remain local and bounded, SHALL be distinguishable from a normally completed frame, and SHALL not suppress valid subsequent output indefinitely

#### Scenario: Compose an overlay and cursor over child damage
- **WHEN** one outer frame changes the child, a host overlay, and the final cursor
- **THEN** no inner synchronization end SHALL make part of that frame visible before its final outer end

### Requirement: Resident live painting is damage proportional
Complete retained visual state SHALL remain available for activation, reconnection, overlay restoration, and resynchronization. Ordinary same-geometry live updates SHALL paint only changed content and required cursor or mode effects rather than repainting the entire child viewport. Equivalent visual state SHALL produce no redundant body paint. Coalescing SHALL preserve the latest complete state, and any incremental update with an unavailable or mismatched base SHALL require resynchronization rather than being mistaken for a complete body.

#### Scenario: Type one character in a stable prompt
- **WHEN** an ordinary prompt edit changes only a bounded subset of child rows at unchanged geometry
- **THEN** unchanged transcript rows SHALL not be repainted merely because the host retains a complete snapshot

#### Scenario: Animate the strip while the child is unchanged
- **WHEN** only a tab title, progress icon, clock, or hover decoration changes
- **THEN** presentation SHALL repaint only the affected host damage and restore the child's cursor without rewriting its unchanged body

#### Scenario: Drop obsolete visual updates
- **WHEN** a slow client cannot present every intermediate update
- **THEN** it SHALL receive a coherent latest state without replaying every obsolete frame or applying a patch to an unavailable base

#### Scenario: Remove an overlay over unchanged content
- **WHEN** an overlay closes after several child updates were coalesced
- **THEN** its damaged cells SHALL be restored from the newest complete retained state without a blank repair frame

### Requirement: Concurrent presentation has independently measured progress
Resident concurrency evidence SHALL exercise at least three real owned A1 children with deterministic overlapping streamed turns, child animations, and all first-responder orders. It SHALL separately establish engine-event progress, child-render progress, terminal-state progress, and selected outer-presentation progress before settlement. It SHALL include hidden and detached intervals, switching, typing, resize, lifecycle pressure, and a slow client. Per-tab missing progress or excessive stalls SHALL NOT be concealed by aggregate percentiles, final snapshots, static status icons, or eventual token presence. Existing controlled-workload p95 budgets SHALL remain input-to-process 16 ms, committed-output-to-present 33 ms, retained activation paint 300 ms, and activation first accepted input 400 ms; engine-to-render delay and worst per-tab gaps SHALL also be reported separately.

#### Scenario: One frozen Agent among two fast Agents
- **WHEN** two Agents keep rendering but the third stops producing intermediate engine, renderer, retained, or presentation checkpoints during an otherwise advancing deterministic workload
- **THEN** concurrency evidence SHALL fail for that Agent and boundary even if pooled latency and final text would pass

#### Scenario: Small terminal fixture passes
- **WHEN** a key recorder or small counter fixture passes but the real A1 streaming workload has not exercised child rendering and animation
- **THEN** that fixture SHALL remain component evidence and SHALL NOT establish real-Agent parallel presentation parity

#### Scenario: Platform evidence differs
- **WHEN** exact built artifacts pass on one platform but another platform is unrun or divergent
- **THEN** each platform SHALL retain its own verdict and no successful platform SHALL certify another

## MODIFIED Requirements

### Requirement: Resident hot paths remain independent and bounded
Input routing, holder PTY draining, child render progress, and viewed-surface delivery SHALL use independent bounded work paths that do not wait on tab lifecycle operations or another tab's rendering. Ingress and pending work SHALL be bounded by declared message and byte limits, and sustained output SHALL yield to input, control, other tabs, and animation deadlines within bounded work rounds. Coalescing MAY replace unpublished presentation states but SHALL preserve the latest complete state and SHALL NOT delay an isolated input or output behind a pacing poll. Hidden output SHALL not require continuously shipping full-screen snapshots to shared routing state in order for the child to continue or for a later view to obtain current content. Expensive surface serialization and blocking operations SHALL NOT hold shared routing authority needed by unrelated tabs.

#### Scenario: All tabs produce high-rate output
- **WHEN** multiple children concurrently emit high-rate streamed output
- **THEN** every holder SHALL continue draining its own PTY and updating retained state within bounded resources while the viewed tab remains responsive

#### Scenario: Lifecycle operation stalls
- **WHEN** process spawn, termination, registry persistence, or another lifecycle operation reaches its deadline
- **THEN** unrelated input, PTY draining, tab switching, and presentation SHALL continue and the lifecycle failure SHALL remain isolated

#### Scenario: Rapidly switch among working tabs
- **WHEN** the user rapidly changes the requested view while several tabs stream
- **THEN** obsolete requested surfaces MAY be skipped, but the eventually committed view SHALL promptly receive one complete newest surface and subsequent live updates

#### Scenario: Render ingress never becomes empty
- **WHEN** visual updates continuously arrive while input and animation work are pending
- **THEN** rendering SHALL yield within its bounded work round and input, control, and animation SHALL not wait for the render queue to become empty
- **AND** obsolete visual updates MAY be replaced but admitted user input SHALL remain ordered and exactly once

### Requirement: Resident presentation commits coherent current state
The attach client SHALL present one coherent state derived from a committed tab topology, viewed identity, complete current child surface, strip, host overlay, terminal modes, and cursor. A create, close, switch, resize, status change, recovery, or overlay transition SHALL NOT expose a new strip state over stale child content, a blank intermediate frame, or a superseded later repaint. Presentation identity SHALL include the tab, process incarnation, revision, and geometry. Old geometry SHALL NOT be replayed as unbounded cursor-addressed content into a differently sized viewport; the prior coherent state MAY remain safely fitted until the matching replacement arrives. Revision ordering SHALL remain scoped to its tab and incarnation.

#### Scenario: Create and select a tab
- **WHEN** a new tab becomes the requested view
- **THEN** the prior coherent frame SHALL remain until the new topology and complete target surface can be committed together without flashing the old child under the new chip

#### Scenario: Close the viewed tab
- **WHEN** the active tab closes and a survivor becomes viewed
- **THEN** the removal, successor selection, complete successor surface, host overlays, and final cursor SHALL become visible coherently

#### Scenario: Update strip and child together
- **WHEN** status, title, hover, clock, child output, or an attach-owned prompt changes during another presentation update
- **THEN** equivalent updates SHALL coalesce to current state and no separately visible clear, strip-only, notice-only, or stale-cursor frame SHALL appear

#### Scenario: Terminal ignores synchronized output
- **WHEN** the outer terminal does not implement synchronized-update controls
- **THEN** each emitted presentation SHALL still be ordered and complete enough to avoid an attach-induced blank or contradictory intermediate frame

#### Scenario: Resize while an old frame is in flight
- **WHEN** the outer terminal shrinks or grows while a previous-size child frame is pending
- **THEN** presentation SHALL not wrap or overwrite unrelated cells by replaying that old frame at new geometry
- **AND** the matching new child surface, overlays, and cursor SHALL commit coherently without waiting for another model token
