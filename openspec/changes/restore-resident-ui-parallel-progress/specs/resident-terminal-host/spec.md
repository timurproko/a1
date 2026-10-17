## ADDED Requirements

### Requirement: Resident publication respects child visual transactions
A valid child synchronized-output transaction SHALL not become visible as separate clear, partial repaint, and final repaint states merely because its bytes arrive in separate transport reads. Retained parsing and terminal query responses SHALL continue during the transaction, while normal presentation uses the previous committed visual state until completion. Subscription and reconnect SHALL observe committed state rather than a half-written transaction. A malformed or unfinished transaction SHALL have bounded local recovery that does not block another tab. The final outer presentation SHALL have one synchronization envelope whose end follows all child, overlay, mode, and cursor changes; nested mode markers SHALL NOT end it early.

#### Scenario: Child paint arrives in installments
- **WHEN** a synchronized clear-and-repaint is split across reads, including splits inside its control sequences
- **THEN** the previous committed screen SHALL remain presented until the replacement transaction is complete
- **AND** the clear or partially repainted child SHALL NOT be published as a completed normal frame

#### Scenario: End and next begin share a read
- **WHEN** one transport read completes a child transaction and starts another unfinished transaction
- **THEN** the completed transaction SHALL remain available as a committed surface independently of the final synchronized-output mode
- **AND** the unfinished transaction SHALL not replace it merely because both arrived in one read

#### Scenario: Subscribe during an open transaction
- **WHEN** a client requests a tab while that child is halfway through a synchronized repaint
- **THEN** the response SHALL use a committed surface or preserve the prior coherent view until the new committed surface is available
- **AND** terminal query responses and other tabs SHALL continue independently

#### Scenario: Transaction never ends
- **WHEN** a child's synchronized transaction remains unfinished beyond the declared recovery bound
- **THEN** recovery SHALL remain local and bounded, SHALL be distinguishable from a normally completed frame, and SHALL not suppress valid subsequent output indefinitely
- **AND** additional bytes, repeated begin controls, and repeated subscriptions SHALL not extend the original recovery deadline

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

#### Scenario: Frame waits behind a slow terminal writer
- **WHEN** a composed frame is queued but not completely written to the outer terminal
- **THEN** it SHALL not advance the actually painted baseline used for subsequent damage
- **AND** replacement or partial-write failure SHALL not leave later damage based on a frame the terminal never received

#### Scenario: Only cursor or visual attributes change
- **WHEN** cursor state, hyperlink target, palette, or cell attributes change without changing the displayed text
- **THEN** the changed semantics SHALL reach presentation without forcing unchanged body content to repaint

### Requirement: Concurrent presentation has independently measured progress
Resident concurrency evidence SHALL exercise at least three real owned A1 children with deterministic overlapping streamed turns, child animations, and all first-responder orders. It SHALL separately establish engine-event progress, child-render progress, terminal-state progress, and selected outer-presentation progress before settlement. It SHALL include hidden and detached intervals, switching, typing, resize, lifecycle pressure, and a slow client. Per-tab missing progress or excessive stalls SHALL NOT be concealed by aggregate percentiles, final snapshots, static status icons, or eventual token presence. Existing controlled-workload p95 budgets SHALL remain input-to-process 16 ms, committed-output-to-present 33 ms, retained activation paint 300 ms, and activation first accepted input 400 ms; engine-to-render delay and worst per-tab gaps SHALL also be reported separately.

#### Scenario: One frozen Agent among two fast Agents
- **WHEN** two Agents keep rendering but the third stops producing intermediate engine, renderer, retained, or presentation checkpoints during an otherwise advancing deterministic workload
- **THEN** concurrency evidence SHALL fail for that Agent and boundary even if pooled latency and final text would pass

#### Scenario: Small terminal fixture passes
- **WHEN** a key recorder or small counter fixture passes but the real A1 streaming workload has not exercised child rendering and animation
- **THEN** that fixture SHALL remain component evidence and SHALL NOT establish real-Agent parallel presentation parity

#### Scenario: Observation cannot establish a duration
- **WHEN** expected stage observations are missing, duplicated, stale, or timed with incompatible clock origins
- **THEN** evidence SHALL report an instrumentation failure instead of dropping the sample or reporting a passing latency
- **AND** forced rendering or pooled samples from other tabs SHALL not replace actual progress at the missing boundary

#### Scenario: Platform evidence differs
- **WHEN** exact built artifacts pass on one platform but another platform is unrun or divergent
- **THEN** each platform SHALL retain its own verdict and no successful platform SHALL certify another

### Requirement: Resident presentation capabilities are negotiated and bounded
Structured complete surfaces SHALL be negotiated independently on holder-to-server and server-to-attach connections. Generation-1 changes SHALL remain additive and respect existing encoded-frame, nesting, collection, input, and declared decoded-memory limits. Peers without the capability SHALL retain a complete legacy-surface route with an explicit fidelity limitation rather than interpreting structured state as legacy ANSI or automatically restarting live tabs. Invalid or oversized state SHALL fail locally with a typed outcome and SHALL not silently truncate the screen or allocate without bounds.

#### Scenario: New attach connects through an old resident cohort
- **WHEN** attach supports structured surfaces but its server or a holder does not
- **THEN** the affected connection SHALL use its negotiated complete legacy route or a typed incompatibility outcome
- **AND** it SHALL not claim repaired parity or terminate existing tabs to upgrade them

#### Scenario: Snapshot exceeds a declared bound
- **WHEN** dimensions, cells, attributes, links, or encoded data exceed the negotiated representation's bounds
- **THEN** validation SHALL reject the state before the corresponding unbounded allocation and preserve the last coherent view or an explicit bounded failure state

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

#### Scenario: Server reconnect overlaps child output
- **WHEN** the server is unavailable and a holder is retrying its connection while the child continues output
- **THEN** the holder SHALL continue bounded PTY parsing, terminal query replies, and retained-state progress without waiting for reconnect completion
- **AND** a later connection SHALL receive current committed state rather than a raw-output replay backlog

#### Scenario: A terminal or socket writer is blocked
- **WHEN** a client's output writer cannot complete a write while input and other tabs have pending work
- **THEN** blocked output SHALL remain isolated from input processing and shared routing authority within declared resource bounds
- **AND** shutdown or connection failure SHALL not leak writer ownership or claim an incomplete paint succeeded

#### Scenario: Render ingress never becomes empty
- **WHEN** visual updates continuously arrive while input and animation work are pending
- **THEN** rendering SHALL yield within its bounded work round and input, control, and animation SHALL not wait for the render queue to become empty
- **AND** obsolete visual updates MAY be replaced but admitted user input SHALL remain ordered and exactly once

### Requirement: Resident presentation commits coherent current state
The attach client SHALL present one coherent state derived from a committed tab topology, viewed identity, complete current child surface, strip, host overlay, terminal modes, and cursor. A create, close, switch, resize, status change, recovery, or overlay transition SHALL NOT expose a new strip state over stale child content, a blank intermediate frame, or a superseded later repaint. Presentation identity SHALL include the tab, process incarnation, revision, and geometry, with response fencing for superseded view/resize requests. Geometry identity SHALL remain distinct from server epoch and input-controller generation. Old geometry SHALL NOT be replayed as unbounded cursor-addressed content into a differently sized viewport; the prior coherent state MAY remain safely fitted until the matching replacement arrives. Revision ordering SHALL remain scoped to its tab and incarnation.

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

#### Scenario: Resize clears the parser synchronization mode
- **WHEN** resizing the retained parser clears synchronized-output mode before the child completes its new-size repaint
- **THEN** that mode reset SHALL not be treated as a completed child visual transaction
- **AND** any fitted prior screen SHALL remain explicitly provisional until a compatible replacement or bounded recovery is available

#### Scenario: A view or incarnation is superseded
- **WHEN** A-to-B-to-A switching, child restart, or repeated shrink/grow requests leave delayed responses in flight
- **THEN** stale request, incarnation, or geometry responses SHALL not overwrite the latest compatible committed view even when tab ID or final dimensions match

#### Scenario: Two clients view one child at different dimensions
- **WHEN** a controller and a differently sized spectator view the same tab
- **THEN** child geometry SHALL retain controller authority and the spectator SHALL safely fit its presentation without repeatedly resizing the shared child

### Requirement: Reattach renders from retained terminal state
Viewing a tab SHALL deliver a complete committed retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by either newer complete surfaces or negotiated patches against an explicitly matching base. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. The server SHALL forward replaceable complete state through a bounded latest-value lane, SHALL require full resynchronization for unavailable patch bases, and SHALL NOT block the holder on the client. Subscriber ownership SHALL account for every client viewing the tab; metadata and retained progress SHALL remain independent of body delivery.

#### Scenario: Reattach after hours detached
- **WHEN** a client views the tab after it produced output for hours while detached
- **THEN** it SHALL render the tab's current committed screen without replaying the history

#### Scenario: One of two viewers disconnects
- **WHEN** two clients view a tab and one disconnects or selects another tab
- **THEN** the remaining client's fresh complete state and subsequent updates SHALL continue
- **AND** losing the final viewer SHALL suppress only unnecessary external body delivery, not child rendering or retained progress

#### Scenario: Stale cached state is offered repeatedly
- **WHEN** a requested view receives repeated cached stale surfaces while awaiting its fresh commit
- **THEN** the bounded fallback deadline SHALL remain anchored to the request rather than restarting for every offer
- **AND** re-offering a cached revision SHALL not count as child-render progress

### Requirement: Resident terminal transport preserves child controls and modes
The resident path SHALL reproduce every supported child terminal effect needed for direct A1 parity, including clipboard writes, hyperlink targets and IDs, cursor visibility/shape/blink, styling, and Unicode cell widths. Styles SHALL preserve default/indexed/RGB colors, intensity, underline kind/color, italic, inverse, conceal, strike, overline, and supported blink. Child focus, mouse, paste, keyboard, alternate-screen and synchronization modes SHALL retain their semantic behavior while attach preserves ownership of outer input modes and holder encodes input against child modes. Replayable visual state SHALL be distinct from bounded ordered foreground one-shot effects, whose identity SHALL include incarnation and an independent sequence rather than a visual revision alone. Retained snapshots SHALL not replay historical effects.

#### Scenario: Child writes the terminal clipboard
- **WHEN** viewed A1 emits a supported clipboard control for selected or copied content
- **THEN** the outer terminal SHALL receive one bounded equivalent control for the user's clipboard without exposing it as visible cells or diagnostic content

#### Scenario: Child changes terminal interaction modes
- **WHEN** viewed A1 changes a supported cursor, focus, mouse, keyboard, hyperlink, alternate-screen, or presentation mode
- **THEN** the resident path SHALL preserve the equivalent semantic effect without surrendering attach-owned outer mode handling
- **AND** detach or failure SHALL restore every attach-owned mode

#### Scenario: Hidden child emits terminal controls
- **WHEN** an unviewed child emits a control whose effect is meaningful only while presented
- **THEN** the holder SHALL retain the child's current semantic state without applying that hidden tab's one-shot effect to the outer terminal
- **AND** later subscription SHALL not replay the suppressed effect

#### Scenario: Two effects share a visual revision
- **WHEN** two valid foreground clipboard writes occur before the next visual commit or obsolete visual states are replaced
- **THEN** both writes SHALL retain their separate ordered once-only identity rather than being deduplicated or replayed by visual revision

#### Scenario: An obsolete holder delivers an effect
- **WHEN** an effect arrives from an old incarnation or superseded foreground authority
- **THEN** it SHALL not be applied to the current outer view

#### Scenario: Link label remains unchanged
- **WHEN** a retained hyperlink's target or explicit identity changes while its label text stays the same
- **THEN** the new semantics SHALL survive reconstruction and damage output
- **AND** hyperlink/style state SHALL not leak into the strip or host overlay
