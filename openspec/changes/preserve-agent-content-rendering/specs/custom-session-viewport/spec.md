## ADDED Requirements

### Requirement: Viewport presentation keeps current agent content stable
Each eligible viewport presentation SHALL contain the newest eligible content of every displayable surface within the current visible range, under existing visibility, expansion, scrolling, and session policies. Streaming, completion, renderer refresh, and input preemption SHALL NOT expose an artificial blank frame, temporarily remove retained content, or restore superseded rows. Legitimate source changes, Markdown reflow, navigation, modal coverage, and authoritative session replacement SHALL remain supported and distinguishable from content loss.

Content repairs SHALL retain bounded work and paint, stable unaffected-row reuse, and existing conservative handling of unsafe terminal content. They SHALL NOT introduce ordinary-streaming full-screen clears, separately exposed erase frames, or delayed live output as a workaround for omissions or flashing. Existing link colors, labels, native activation, semantic copy, and movement safeguards SHALL remain unchanged; repairing pre-existing wrapped-target and host-hover defects is separate work.

#### Scenario: Continue output after arguments complete
- **WHEN** a visible tool progresses from completed arguments to running output and its final result while older conversation content remains in view
- **THEN** the viewport SHALL present its current eligible state without an artificial blank or argument-only replacement of a later result
- **AND** other retained visible surfaces SHALL NOT disappear at message, run, or settlement boundaries

#### Scenario: Refresh renderer height with a frame pending
- **WHEN** a renderer changes its content or height while a stream or dock presentation is pending
- **THEN** the next eligible frame SHALL combine current renderer content with current viewport, selection, control, and dock geometry
- **AND** an older pending frame SHALL NOT restore stale rows or offsets after that presentation

#### Scenario: Interact during streaming
- **WHEN** the reader types, scrolls, selects and copies, or opens and closes a modal while agent content updates
- **THEN** the existing interaction and visibility policies SHALL remain intact with responsive input
- **AND** exposed transcript surfaces SHALL show their current eligible content without resize or reopen being needed to recover a missed update

#### Scenario: Update one surface beside stable history
- **WHEN** one visible surface changes while other surfaces and dock geometry remain stable
- **THEN** content rendering SHALL retain the existing bounded work and paint behavior for unaffected history
- **AND** it SHALL NOT repeatedly clear the full screen or blank stable content to conceal an invalidation defect

#### Scenario: Replay without synchronized-presentation support
- **WHEN** ordinary content updates are replayed with synchronization honored and with synchronization ignored
- **THEN** the checked cells, styles, cursor, and current composed content SHALL remain correct in both modes
- **AND** content remediation SHALL NOT rely on a separately exposed blank or stale frame being hidden by synchronization

### Requirement: Content acceptance is independent of deferred native-link repairs
Content-rendering acceptance SHALL include production-ordered semantic and presentation evidence, independent pinned-renderer parity, bounded-work and terminal-protocol validation, and user-controlled review of the exact built candidate in Windows Terminal. The evidence SHALL identify candidate and baseline builds, terminal version, geometry, relevant capabilities/settings, workload and content categories, visibility settings, and documented A1 differences. It SHALL distinguish content omission, stale rendering, terminal cell errors, and unnecessary A1-induced flashing from host-only hover decoration using bounded, appropriately sanitized observations.

Disappearing content, resize/reopen-dependent refresh, or unexplained A1-induced block flashing SHALL prevent content acceptance even if final snapshots and CI pass. A lower frame or clear count SHALL NOT substitute for stable content. The explicit `a1 pi` oracle and installed Pi packages SHALL remain untouched.

The user-approved scope split tracks pre-existing native-link ghosts and wrapped-target defects in [issue #353](https://github.com/timurproko/a1/issues/353). Those known defects SHALL remain explicitly unresolved until their separate acceptance passes; they SHALL NOT block this content change's acceptance solely because they remain open. This separation SHALL NOT waive other changes' link contracts, permit a newly introduced link regression or altered link semantics, or claim that passing content evidence repairs native host decoration.

#### Scenario: Review content across a complete run
- **WHEN** the exact candidate generates commentary, thinking, fenced code, multiple tools, structured edit output, attachments, and asynchronous renderer updates in a conversation with prior history
- **THEN** displayable content SHALL remain available and stably presented under existing visibility and expansion settings during execution and after settlement
- **AND** no block SHALL require resize or reopen to recover a missed presentation

#### Scenario: Compare the independent pinned reference
- **WHEN** equivalent supported workloads are exercised through A1 and the independent actual pinned renderers or explicit pinned comparison route
- **THEN** shared content and tool-rendering behavior SHALL match outside documented A1 differences
- **AND** the comparison route SHALL not acquire A1-specific viewport composition, link decoration, or damage optimization

#### Scenario: Physical block flashing persists despite correct final cells
- **WHEN** the candidate still unnecessarily flashes or drops content during ordinary scheduled streaming but later produces the correct final cells
- **THEN** content acceptance SHALL remain incomplete
- **AND** the discrepancy SHALL be investigated against intermediate states and the pinned reference rather than hidden by full-screen clears or forced per-event painting

#### Scenario: Known native ghosts remain after content acceptance passes
- **WHEN** content correctness, stability, required CI, and exact-candidate user review pass but a pre-existing native-link defect remains reproducible
- **THEN** the content change SHALL be eligible for user-authorized acceptance independently of that defect
- **AND** the handoff SHALL identify issue #353 as unresolved without claiming a native-link fix or closing its separate acceptance gate

#### Scenario: A content repair introduces a new link regression
- **WHEN** the candidate changes previously working link colors, labels, activation, semantic copy, or movement safety
- **THEN** this change's acceptance SHALL remain incomplete
- **AND** the new regression SHALL NOT be excused by the existence of the separately tracked link issue
