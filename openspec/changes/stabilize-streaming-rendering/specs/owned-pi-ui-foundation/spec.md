## ADDED Requirements

### Requirement: Rendering stability is proven from terminal paint evidence
A rendering-affecting change to the owned shell SHALL be validated with bounded terminal-paint evidence in addition to semantic row snapshots. The evidence SHALL independently exercise bare A1, the pinned `a1 pi` comparison, and untouched pinned Pi under equivalent profile state, terminal geometry, theme, capabilities, transcript, deterministic stream updates, and input checkpoints. It SHALL distinguish the default regular-mode comparison from a mode-matched fullscreen comparison so differences caused by terminal ownership are not misattributed to transcript content.

For each checkpoint the evidence SHALL record the resulting cell frame and classify terminal writes including presentation cadence, bytes, cleared and rewritten rows, full-screen clears, viewport shifts, stable-row rewrites, synchronized-update boundaries, and dock geometry. Producer failure, timeout, malformed output, unbounded evidence, or an unexplained difference SHALL fail the gate.

#### Scenario: Compare default user-visible paths
- **WHEN** the rendering analysis compares bare `a1`, default `a1 pi`, and default untouched Pi
- **THEN** all producers SHALL receive equivalent deterministic state and actions
- **AND** the result SHALL identify that bare A1 uses its declared fullscreen custom viewport while the default comparison paths use their configured Pi mode
- **AND** visible instability SHALL not be dismissed merely because final semantic text matches

#### Scenario: Isolate fullscreen viewport behavior
- **WHEN** the analysis investigates a difference that may be caused by regular versus fullscreen terminal ownership
- **THEN** it SHALL also compare bare A1 with `a1 pi` and untouched Pi configured to the same fullscreen mode and geometry
- **AND** it SHALL attribute differences separately to the fullscreen renderer, custom viewport composition, and transcript component output

#### Scenario: Capture a deterministic streaming workload
- **WHEN** prose, incomplete Markdown, thinking, tool output, fit/overflow crossing, a long transcript, resize, or detached scrolling is replayed
- **THEN** the evidence SHALL include complete cell frames and paint classifications at declared checkpoints
- **AND** it SHALL detect a full-screen clear, stable-row rewrite, dock jump, blank intermediate state, missed final state, or excessive frame cadence outside the workload's declared allowance

#### Scenario: Terminal lacks synchronized-update support
- **WHEN** the same workload is evaluated without synchronized terminal updates
- **THEN** rendering SHALL remain free of blank or partially cleared intermediate frames through bounded damage and write ordering
- **AND** unsupported synchronization SHALL be recorded rather than treated as successful atomic presentation

#### Scenario: Comparison producer fails
- **WHEN** bare A1, `a1 pi`, or untouched Pi exits unexpectedly, times out, or cannot produce a declared checkpoint
- **THEN** the rendering-stability gate SHALL fail
- **AND** it SHALL retain bounded diagnostics and clean up every isolated process tree

#### Scenario: Repeat the same evidence command
- **WHEN** the rendering evidence is run repeatedly against the same artifact and workload
- **THEN** producer startup and completion SHALL remain within declared per-workload bounds
- **AND** semantic results and paint classifications SHALL be deterministic
- **AND** every reported finding SHALL be derived from captured checkpoints rather than a hard-coded description of an earlier implementation state

### Requirement: Damage-aware painting uses an A1-owned public boundary
Bare A1 SHALL implement damage-aware fullscreen presentation through an A1-owned adapter over documented public terminal/runtime ports. The adapter SHALL receive authoritative semantic frame metadata from the owned viewport, SHALL NOT infer transcript semantics from terminal bytes, and SHALL transform only the finite pinned fullscreen-write grammar covered by conformance fixtures. A grammar, capability, safety, or geometry mismatch SHALL fail closed by forwarding the original Pi write unchanged. The adapter SHALL NOT require an upstream Pi change, inspect private Pi state, patch prototypes, edit installed package files, or alter `a1 pi` and untouched Pi comparison paths.

#### Scenario: Rewrite a declared safe shift
- **WHEN** the owned viewport declares a safe transcript shift and the corresponding Pi terminal write matches the pinned conformance grammar
- **THEN** the A1-owned adapter SHALL emit bounded transcript-region movement plus only exposed or genuinely damaged row paints
- **AND** dock rows and cursor placement SHALL remain correct

#### Scenario: Reject an unproven transformation
- **WHEN** the semantic descriptor is absent or unsafe, or the terminal write does not exactly match the declared grammar, geometry, and capabilities
- **THEN** the adapter SHALL forward the original terminal write without partial transformation
- **AND** it SHALL expose a bounded cause classification to rendering evidence

#### Scenario: Run a comparison producer
- **WHEN** `a1 pi`, regular-mode A1, or untouched pinned Pi renders the equivalent workload
- **THEN** the A1-owned damage adapter SHALL not be active
- **AND** the producer's package identity and terminal writes SHALL remain unchanged

### Requirement: Stream presentation cadence is bounded without changing semantics
The owned shell SHALL coalesce high-frequency semantic updates to a declared presentation cadence while preserving source order, final content, immediate input feedback, status animation, tool completion, errors, and lifecycle transitions. The cadence gate SHALL count terminal presentation frames, not only engine events or render requests. A sustained stream SHALL not produce more terminal frames than the declared cadence permits, and completion SHALL flush the newest state without first presenting superseded pending states.

#### Scenario: Chunks arrive faster than presentation cadence
- **WHEN** assistant or tool updates arrive faster than the declared presentation interval
- **THEN** terminal frame count SHALL remain bounded by that interval
- **AND** the newest complete state for each interval SHALL be presented

#### Scenario: Stream completes between scheduled frames
- **WHEN** a stream's final event arrives while an earlier presentation is pending
- **THEN** the pending state SHALL be superseded by the final state
- **AND** the final transcript and lifecycle surfaces SHALL be presented without waiting for another ordinary interval

#### Scenario: Status animation overlaps content streaming
- **WHEN** a timed working indicator and transcript updates are active together
- **THEN** each SHALL retain its declared cadence and current state
- **AND** coalescing transcript updates SHALL not stall or multiply status animation frames
