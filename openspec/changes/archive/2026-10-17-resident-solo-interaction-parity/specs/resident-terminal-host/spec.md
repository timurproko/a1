# Spec Delta

## ADDED Requirements

### Requirement: Resident terminal transport preserves semantic input events
The attach, server, and holder path SHALL preserve the key identity, modifiers, text, paste boundary, focus, mouse gesture, and resize represented by each accepted outer-terminal event until the viewed child consumes it. Transport and controller handoff SHALL deliver accepted events exactly once in order or reject them visibly before any partial delivery.

#### Scenario: Forward supported modified input
- **WHEN** the outer terminal reports a supported Ctrl, Alt, Shift, navigation, function, text/IME, focus, mouse, or resize event not owned by the tab shell
- **THEN** the child SHALL observe the same effective event that direct A1 observes on that platform

#### Scenario: Preserve one paste transaction
- **WHEN** the outer terminal reports a bounded paste whose payload spans transport frames
- **THEN** the holder SHALL admit and expose one complete child paste in order or reject the whole payload before delivering a prefix

#### Scenario: Transfer control during input
- **WHEN** a view change or focus claim occurs while prior and new input are in flight
- **THEN** no accepted event SHALL be duplicated, reordered, attributed to the wrong tab, or silently dropped

### Requirement: Resident terminal transport preserves child controls and modes
The resident path SHALL reproduce every supported child terminal side effect needed for direct A1 parity, including clipboard writes, hyperlinks, cursor visibility and shape, focus and mouse modes, alternate-screen state, synchronized presentation, styling, and Unicode cells. A control consumed by retained terminal parsing SHALL still reach the outer terminal when its direct effect belongs there.

#### Scenario: Child writes the terminal clipboard
- **WHEN** viewed A1 emits a supported clipboard control for selected or copied content
- **THEN** the outer terminal SHALL receive one bounded equivalent control for the user's clipboard without exposing it as visible cells or diagnostic content

#### Scenario: Child changes terminal interaction modes
- **WHEN** viewed A1 changes a supported cursor, focus, mouse, keyboard, hyperlink, alternate-screen, or presentation mode
- **THEN** the attach client SHALL apply an equivalent outer effect and later restore every attach-owned mode on detach or failure

#### Scenario: Hidden child emits terminal controls
- **WHEN** an unviewed child emits a control whose effect is meaningful only while presented
- **THEN** the holder SHALL retain the child's current semantic state without applying that hidden tab's effect to the outer terminal

### Requirement: Resident presentation commits coherent current state
The attach client SHALL present one coherent state derived from a committed tab topology, viewed identity, complete current child surface, strip, host overlay, terminal modes, and cursor. A create, close, switch, resize, status change, recovery, or overlay transition SHALL NOT expose a new strip state over stale child content, a blank intermediate frame, or a superseded later repaint.

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

### Requirement: Resident hot paths remain independent and bounded
Input routing, holder PTY draining, child render progress, and viewed-surface delivery SHALL use independent bounded work paths that do not wait on tab lifecycle operations or another tab's rendering. Coalescing MAY replace unpublished presentation states but SHALL preserve the latest complete state and SHALL NOT delay an isolated input or output behind a pacing poll.

#### Scenario: All tabs produce high-rate output
- **WHEN** multiple children concurrently emit high-rate streamed output
- **THEN** every holder SHALL continue draining its own PTY and updating retained state within bounded resources while the viewed tab remains responsive

#### Scenario: Lifecycle operation stalls
- **WHEN** process spawn, termination, registry persistence, or another lifecycle operation reaches its deadline
- **THEN** unrelated input, PTY draining, tab switching, and presentation SHALL continue and the lifecycle failure SHALL remain isolated

#### Scenario: Rapidly switch among working tabs
- **WHEN** the user rapidly changes the requested view while several tabs stream
- **THEN** obsolete requested surfaces MAY be skipped, but the eventually committed view SHALL promptly receive one complete newest surface and subsequent live updates

### Requirement: Interaction parity is certified across the complete resident boundary
Resident fidelity SHALL be demonstrated by driving equivalent sanitized interaction scripts through exact built direct and resident candidates on every supported platform and comparing semantic child outcomes, terminal presentation, clipboard/control effects, and responsiveness. Isolated encoder, parser, model, or final-snapshot probes SHALL NOT alone establish parity.

#### Scenario: Compare the parity matrix
- **WHEN** certification exercises prompt editing, effective shortcuts, completion, history, selection, copy, paste, mouse, dialogs, extension text UI, attachments, focus, resize, streaming, and detach
- **THEN** each interaction SHALL match direct A1 except for the explicitly declared resident-only differences

#### Scenario: Compare concurrent resident behavior
- **WHEN** certification runs several independently streaming tabs with rapid switching, lifecycle operations, paste, selection, resize, and slow-client pressure
- **THEN** it SHALL detect delayed background rendering, input stalls, stale surfaces, duplicate or missing events, and cross-tab interference rather than relying only on settled snapshots

#### Scenario: Record a platform-specific divergence
- **WHEN** exact-artifact evidence finds a resident/direct mismatch on one supported platform
- **THEN** that platform's parity verdict SHALL fail with the interaction and boundary named and SHALL NOT be inferred from another platform's result
