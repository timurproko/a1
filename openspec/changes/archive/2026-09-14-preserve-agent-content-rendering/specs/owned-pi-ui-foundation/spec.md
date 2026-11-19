## ADDED Requirements

### Requirement: Tool argument completion does not finalize execution
The owned shell SHALL distinguish completion of an assistant message's tool arguments from completion of the corresponding tool execution. A completed call declaration SHALL remain eligible for execution-start and accumulated-result updates until that execution succeeds, fails, or is aborted. One tool invocation SHALL retain one stable surface through those transitions. Repeated declarations and message/turn reconciliation SHALL NOT downgrade a completed execution to an argument-only or running surface.

The stale-update policy SHALL reject obsolete revisions and updates following actual execution completion, not valid later phases of the same invocation. These guarantees SHALL hold across coalesced delivery, multiple tools, and full-view reconciliation.

#### Scenario: Execute after arguments finish
- **WHEN** an assistant finishes a tool-call message and that invocation subsequently starts and produces live output
- **THEN** the same tool surface SHALL show the running execution and newest accumulated output at the next eligible presentation
- **AND** argument completion SHALL NOT cause that output to be classified as stale

#### Scenario: Complete with a partial presentation pending
- **WHEN** an execution completes while an older partial update is queued or awaiting presentation
- **THEN** its final result SHALL become immediately eligible for presentation
- **AND** the old partial SHALL NOT overwrite, reopen, or remove the completed result

#### Scenario: Restate a completed call
- **WHEN** message or turn reconciliation repeats a tool declaration after that invocation has produced its final result
- **THEN** the result, execution disposition, arguments, and stable surface identity SHALL remain available without an intermediate argument-only replacement

#### Scenario: Interleave multiple executions
- **WHEN** several tool invocations have interleaved declarations, execution updates, errors, and completions
- **THEN** each surface SHALL retain the correct invocation's arguments, output, and disposition
- **AND** completion of one invocation SHALL NOT suppress another invocation's live output

#### Scenario: Abort a declared invocation
- **WHEN** the pinned lifecycle aborts or rejects a declared tool invocation before or during execution
- **THEN** its visible terminal disposition SHALL follow the pinned error/abort behavior
- **AND** later obsolete execution updates SHALL NOT revive it

### Requirement: Run completion preserves the active transcript continuously
Every displayable semantic user, assistant, thinking, and tool surface in the active transcript SHALL remain available in its established order through message completion, run completion, settlement, and presentation coalescing. A completion event carrying only the messages generated in that run SHALL NOT be interpreted as a replacement for the complete session history, even temporarily. Reconciliation SHALL use the pinned session-authoritative scope appropriate to the operation and SHALL preserve unchanged surface identities.

This requirement SHALL preserve existing visibility, expansion, branch, compaction, navigation, and explicit session-replacement policies. It SHALL NOT require retaining every superseded partial snapshot or rendering off-screen or deliberately hidden content. Actual authoritative removal or session replacement SHALL remain distinguishable from ordinary run completion.

#### Scenario: Finish a later run in an existing conversation
- **WHEN** earlier user and assistant messages exist and a later run ends with a run-local message collection
- **THEN** every presented intermediate and settled transcript state SHALL retain the earlier messages and all displayable messages of the later run
- **AND** no later settlement event SHALL be needed to restore missing earlier surfaces

#### Scenario: Delay settlement after run completion
- **WHEN** settlement follows run completion after an asynchronous operation or additional event-loop turns
- **THEN** the transcript SHALL remain complete throughout that interval
- **AND** the reader SHALL be able to scroll to and copy earlier retained content

#### Scenario: Complete mixed assistant content
- **WHEN** an assistant emits consecutive or interleaved text, thinking, code, and tool-call content and completes
- **THEN** all displayable parts SHALL retain their source order and pinned content boundaries
- **AND** starting a subsequent message SHALL NOT remove completed commentary or thinking surfaces

#### Scenario: Replace the authoritative session scope
- **WHEN** explicit session or branch replacement, or the existing compaction policy, supplies a legitimately different authoritative transcript
- **THEN** the shell SHALL reconcile that scope according to its existing contract
- **AND** obsolete generation events SHALL NOT repopulate removed content or mutate the replacement session

### Requirement: Tool presentation receives complete supported rendering data
The owned component boundary SHALL preserve the supported result content, structured renderer details, invocation arguments, error/partial state, and attachment references required by the pinned built-in and registered extension renderers. A text-only reconstruction or a truncated diagnostic summary SHALL NOT substitute for rendering data. Supported partial-result metadata SHALL remain available without serializing a complete accumulated result for each chunk.

Existing validated payload and asset limits SHALL remain enforced. When a supported representation is unavailable or a renderer fails, the shell SHALL preserve the existing visible fallback or error behavior rather than silently omit the affected result. Attachment ownership SHALL remain consistent when references arrive after the initial call surface is created.

#### Scenario: Render a successful edit without a usable preview
- **WHEN** a completed edit supplies an authoritative diff but its earlier preview is absent, stale, or failed
- **THEN** the completed surface SHALL show the authoritative result diff in pinned styling
- **AND** it SHALL NOT depend on rereading the already-edited file to recover discarded result metadata

#### Scenario: Render structured extension output
- **WHEN** a registered tool renderer consumes supported structured details from a partial or final result
- **THEN** those details and the invocation state SHALL reach the renderer without being replaced by plain text or a diagnostic-summary wrapper
- **AND** coalescing SHALL preserve the newest complete rendering state for that invocation

#### Scenario: Add an attachment after the call header
- **WHEN** a tool's result introduces a supported image or attachment after its call surface already exists
- **THEN** the existing surface SHALL acquire the corresponding inline presentation or declared fallback according to settings and terminal capabilities
- **AND** the attachment SHALL NOT disappear because the initial surface had no attachment references

#### Scenario: Encounter unsupported or failing presentation
- **WHEN** rendering data exceeds an existing supported limit, an asset is unavailable, or a custom renderer fails
- **THEN** the shell SHALL apply the declared bounded fallback or failure behavior
- **AND** unaffected transcript content and operation outcome SHALL remain visible

### Requirement: Presentation invalidation is independent of semantic completion
A mounted renderer's supported invalidation request SHALL make its current presentation eligible for the real shell scheduler even when its semantic block revision and execution disposition have not changed. The next eligible frame SHALL refresh the affected rendering and any dependent document or viewport geometry rather than reuse stale cached rows.

Presentation invalidation SHALL preserve semantic identity and SHALL NOT manufacture agent events, completed-message counts, or persisted conversation entries. Unaffected block caches SHALL remain reusable. Obsolete renderer callbacks SHALL NOT invalidate a replacement component or session. Off-screen invalidation SHALL mark the affected presentation stale without requiring eager rendering of the complete historical transcript.

#### Scenario: Finish an asynchronous preview after a frame
- **WHEN** a renderer completes asynchronous preview work and requests invalidation after its finalized block was rendered
- **THEN** the updated preview SHALL appear at the next eligible frame without requiring another agent event, user input, resize, or reopen
- **AND** cached document rows SHALL not hide the renderer's new output

#### Scenario: Change row count asynchronously
- **WHEN** a renderer invalidation changes the height of an existing surface
- **THEN** dependent document extent, viewport allocation, follow/detach state, selection mapping, and hit regions SHALL be recomputed consistently
- **AND** unaffected semantic content and dock ownership SHALL remain intact

#### Scenario: Invalidate during a pending dock or stream frame
- **WHEN** a renderer changes after a frame is requested but before that frame is composed
- **THEN** presentation SHALL use its newest eligible state
- **AND** an earlier dock-reuse decision or stream timer SHALL NOT restore the old rows

#### Scenario: Complete work for an obsolete renderer
- **WHEN** asynchronous work completes after the owning component was replaced or disposed or its session generation changed
- **THEN** its callback SHALL NOT repaint or invalidate the replacement surface
- **AND** no old semantic state SHALL be revived

#### Scenario: Invalidate an off-screen block
- **WHEN** an off-screen mounted renderer invalidates while the reader views other content
- **THEN** its next visible presentation SHALL be current
- **AND** the invalidation SHALL NOT force every historical block to render immediately

### Requirement: Agent content presentation follows pinned Pi outside declared product differences
For equivalent supported inputs and visibility settings, the owned shell SHALL preserve pinned Pi's displayable content boundaries, tool-result presentation, text styling and spacing, and execution/renderer lifecycle behavior outside existing documented A1 product differences. It SHALL NOT replace supported structured tool presentation with a text approximation or introduce avoidable content disappearance or flashing through its adaptations.

This requirement SHALL preserve existing bounded delivery, payload validation, asset ownership, error isolation, and viewport/editor/modal/selection behavior. It SHALL NOT require removing documented A1 features, showing superseded partial snapshots, or modifying the pinned comparison route. Existing link-specific defects tracked separately in issue #353 SHALL NOT be represented as intentional content differences or as repaired by this parity claim.

#### Scenario: Present ordinary text and tool output
- **WHEN** equivalent assistant text, thinking, fenced code, and text-only tool output are presented in A1 and the independent pinned reference
- **THEN** content boundaries and styled presentation SHALL match outside documented A1 differences
- **AND** A1 SHALL NOT omit a required surface or add artificial blank or argument-only replacement states

#### Scenario: Present structured tool results through a simplified adapter
- **WHEN** a content-rendering adaptation is simplified and equivalent supported edit or extension results are compared with pinned Pi
- **THEN** the actual result presentation and lifecycle behavior SHALL remain faithful to pinned Pi
- **AND** payload limits, attachment ownership, visible fallbacks, and unrelated transcript content SHALL remain protected

### Requirement: Content-retention evidence uses production lifecycle and presentation boundaries
Rendering acceptance SHALL exercise the pinned production event ordering, including assistant argument completion before tool execution, multiple messages and invocations, run-local completion collections, delayed settlement, and asynchronous renderer callbacks. It SHALL verify complete semantic state, component output, cached document output, and emitted terminal results at intermediate as well as final checkpoints.

Evidence SHALL include ordinary scheduled presentation and coalesced bursts rather than force a render after every event in every workload. Tool-rendering parity SHALL use independent pinned renderers or the untouched pinned process with equivalent input, not an A1-authored text approximation, and SHALL identify existing documented A1 differences. Assertions SHALL detect omitted content, stale presentation, loss of structured results, resurrection of completed output, and artificial blank or stale intermediate frames separately from terminal damage and native hover behavior. Matching final text or reducing paint counts alone SHALL NOT establish content stability.

#### Scenario: Exercise the argument-to-execution boundary
- **WHEN** a production-ordered tool workload completes arguments, emits accumulated output, and settles with an older conversation present
- **THEN** evidence SHALL fail if any required live result is rejected, a completed result is downgraded, or prior transcript content disappears at any checked presentation boundary

#### Scenario: Exercise actual scheduling
- **WHEN** a burst combines content updates, completion, asynchronous invalidation, and keyboard or pointer input without per-event forced painting
- **THEN** the next eligible presentations SHALL contain all required current content and retain responsive input
- **AND** no superseded frame SHALL restore stale rows after those presentations

#### Scenario: Compare real tool rendering
- **WHEN** structured edit or extension results are compared with pinned Pi
- **THEN** equivalent complete payloads SHALL drive the independent actual tool renderers
- **AND** text-only substitute renderers or expectations derived solely from A1 SHALL NOT establish parity

#### Scenario: Detect transient presentation faults
- **WHEN** a test-only negative control drops a required surface, exposes an artificial blank frame, or restores stale rows before later recovering the correct final text
- **THEN** the corresponding intermediate or scheduled-presentation gate SHALL fail
- **AND** the eventual correct final snapshot SHALL NOT hide the fault

#### Scenario: Physical content instability contradicts automated evidence
- **WHEN** the exact candidate still loses a displayable block, requires resize/reopen to reveal current output, or exhibits unexplained A1-induced block flashing during user-controlled review
- **THEN** content-rendering acceptance SHALL remain incomplete
- **AND** evidence SHALL identify the earliest boundary where required content, presentation, or stability diverged from the pinned reference outside documented A1 differences

## MODIFIED Requirements

### Requirement: A streaming tool execution costs frames, not chunks
While a tool execution streams output, the owned shell SHALL bound its work by the frame
cadence rather than by the number of output chunks the engine reports. Partial results
that arrive faster than a frame SHALL be coalesced so that only the newest accumulated
output and supported rendering metadata per tool call are applied, and the work performed
to apply one partial SHALL NOT re-serialize or re-summarize the whole accumulated output.
A tool execution's final result SHALL supersede any partial still waiting, and SHALL be
applied without waiting for the coalescing interval. Completion of generated arguments
SHALL NOT be treated as execution completion for this policy.

Applying one streamed block SHALL invalidate only that block's rendered state and its
dependent layout; the other components' caches SHALL survive the chunk. Reading the view
during a stream SHALL NOT recompute derived session aggregates (usage, context,
subscription state) per chunk; they SHALL be recomputed only when an event that can
change them arrives. Renderer-driven presentation changes SHALL remain eligible for
invalidation independently of semantic block revisions.

#### Scenario: Shell stays live under a heavy command
- **WHEN** the agent executes a command that streams output faster than the frame
  interval for many seconds
- **THEN** typed input SHALL be accepted and echoed while the command runs
- **AND** timed indicators SHALL keep animating for the duration of the command

#### Scenario: Chunks outnumber frames
- **WHEN** many partial results for one tool call arrive within one coalescing interval
- **THEN** the shell SHALL apply only the newest of them, including its supported rendering metadata
- **AND** the intermediate partials SHALL NOT each pay the event pipeline's full cost

#### Scenario: The end of a tool execution is immediate
- **WHEN** a tool execution ends while a coalesced partial is still waiting
- **THEN** the final result SHALL be applied immediately and the waiting partial SHALL be
  discarded rather than applied afterwards
- **AND** flushing the adapter's events SHALL deliver any coalesced partial that has not
  yet been applied, so a caller that flushes observes the newest output

#### Scenario: A partial result is not summarized
- **WHEN** a partial tool result restates the accumulated output
- **THEN** the shell SHALL render its text from the block's text while retaining supported structured details and attachment references required by the renderer
- **AND** a serialized diagnostic summary of the result SHALL be produced only when the execution ends
- **AND** that summary SHALL NOT replace the complete supported rendering payload
