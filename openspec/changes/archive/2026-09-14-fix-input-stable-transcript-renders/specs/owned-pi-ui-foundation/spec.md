## MODIFIED Requirements

### Requirement: Comparative input responsiveness has independent evidence
Keyboard responsiveness acceptance SHALL use isolated bare-`a1`, `a1 pi`, and untouched pinned-Pi producers with equivalent terminal geometry, prepared state, input sequence, scheduler controls, and warmed execution. Evidence SHALL identify input receipt, semantic application, presentation request, composition, terminal write, highest presented input revision, pending-frame depth, and accepted-but-unpresented backlog for ordinary typing, rapid editing, submit, menu navigation, replacement surfaces, long transcripts, and concurrent streaming.

Deterministic ordering, scheduling, backlog, frame-count, stable-work, and terminal-paint budgets SHALL be automated gates. Same-run monotonic first-state and final-state input-to-paint distributions SHALL be recorded for diagnosis and comparison but SHALL NOT be the sole automated verdict. Exact-artifact comparison in Windows Terminal against `a1 pi` SHALL remain authoritative for perceived responsiveness.

Stable-work evidence SHALL associate each measured composition's transcript render delta and terminal paint with that composition's own cause and viewport regions. A checkpoint containing multiple frames SHALL NOT attribute all of its work to its final frame. Frames classified as geometry-stable dock input SHALL retain a budget of zero transcript block renders and zero transcript painted rows. Measured non-input work SHALL remain explicitly represented; no frame, counter increment, or write range SHALL be dropped, counted twice, or relabeled to satisfy a budget. Evidence collection SHALL be observational and SHALL NOT render, flush, repair, or reschedule the candidate to obtain a passing result.

#### Scenario: Run the comparative input matrix
- **WHEN** keyboard-responsiveness evidence is captured
- **THEN** each producer SHALL run independently with the same declared workload inputs and environment
- **AND** the result SHALL report bounded machine-readable phase, backlog, frame, paint, and monotonic timing evidence
- **AND** a producer failure, timeout, malformed result, or missing checkpoint SHALL fail the evidence gate

#### Scenario: Evaluate a rapid-input workload
- **WHEN** the bare-A1 producer completes a declared typing, editing, or menu-navigation burst
- **THEN** its semantic result SHALL match the comparison producers
- **AND** its pending keyboard presentation depth, stale-input backlog, superseded frame count, and stable transcript work SHALL stay within the repository-owned deterministic budgets
- **AND** diagnostic first-state and final-state timings SHALL be compared with the same-run `a1 pi` and pinned-Pi distributions

#### Scenario: Evaluate a long transcript
- **WHEN** equivalent input is applied with both an empty transcript and a prepared long transcript
- **THEN** bare A1's keyboard routing, pending-frame depth, dock/input work, and input-to-paint presentation opportunities SHALL remain equivalent
- **AND** settled transcript size SHALL NOT add per-key transcript rendering work

#### Scenario: Accept physical responsiveness
- **WHEN** an exact candidate artifact is tested in Windows Terminal beside `a1 pi`
- **THEN** typing SHALL visibly start immediately, rapid bursts SHALL visibly finish without catching up after input stops, and held or repeated menu navigation SHALL track the current selection
- **AND** any user-observed delayed start, delayed finish, stale selection, or material responsiveness gap SHALL invalidate acceptance despite passing diagnostics

#### Scenario: A stream frame precedes stable input in one checkpoint
- **WHEN** a legitimate stream-content frame renders or paints transcript content and a later stable dock-input frame in the same checkpoint performs no transcript work
- **THEN** the stream work SHALL remain attributed to the stream frame
- **AND** the dock-input frame SHALL contribute zero stable transcript work regardless of its position in the checkpoint

#### Scenario: A stable-input violation precedes another frame
- **WHEN** a dock-input frame performs a transcript block render or paints a transcript row before a stream or geometry frame in the same checkpoint
- **THEN** the stable-work gate SHALL fail for the violating dock-input frame
- **AND** the later frame's cause SHALL NOT hide the earlier violation

#### Scenario: Frame evidence is incomplete or inconsistent
- **WHEN** measured render deltas or terminal-write ranges cannot be accounted for exactly once, frame ordering or cause is ambiguous, or required evidence is missing
- **THEN** the gate SHALL reject the evidence rather than assume zero work or fall back to the final checkpoint cause
- **AND** legitimate no-write compositions and separately identified non-frame terminal controls SHALL remain representable without fabricating a frame

#### Scenario: Diagnose the first stable-work failure
- **WHEN** a frame violates a stable-render or stable-paint budget
- **THEN** the failure SHALL identify the workload, producer, checkpoint, frame identity and cause, expected and actual counters, viewport region, and relevant terminal-write range from the original capture
- **AND** the diagnostic SHALL be bounded, SHALL NOT require a second producer run, and SHALL NOT dump arbitrary transcript or credential content
