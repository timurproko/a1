## ADDED Requirements

### Requirement: Keyboard input reaches an immediate current-state presentation
The owned shell SHALL accept and apply terminal keyboard input in receipt order without dropping, duplicating, or reinterpreting text, editing commands, navigation, shortcuts, paste, submission, cancellation, or interruption. Keyboard-driven semantic state SHALL NOT wait for the streamed-presentation cadence. The first eligible input state SHALL request immediate presentation, and rapid input MAY omit superseded intermediate visual states only when every input has already been applied in order and the next presentation contains the newest eligible state.

The shell SHALL keep at most one keyboard-driven presentation pending, SHALL NOT let a pending stream frame or a sequence of stale input frames delay newer input, and SHALL reach zero accepted-but-unpresented input backlog when the input burst and immediate presentation opportunity complete. These guarantees SHALL apply to the default editor, selectors, menus, dialogs, and declared replacement input surfaces; an extension or terminal sequence that is not known to be safe for burst coordination SHALL retain conservative ordered delivery.

#### Scenario: Type an isolated character
- **WHEN** the ordinary editor receives one text or editing key while the session is idle
- **THEN** the key SHALL be applied in receipt order and the resulting state SHALL become eligible for immediate presentation without waiting for a frame-cadence timer
- **AND** no unrelated transcript work or older pending input frame SHALL delay it

#### Scenario: Type a rapid text burst
- **WHEN** multiple text inputs arrive before the first keyboard-driven presentation runs
- **THEN** every input SHALL be applied exactly once in receipt order
- **AND** the first presentation after the burst SHALL contain the newest applied editor state
- **AND** superseded intermediate states MAY remain unpainted rather than each forcing a separate frame
- **AND** accepted-but-unpresented input backlog SHALL return to zero after that presentation

#### Scenario: Edit text rapidly
- **WHEN** cursor movement, deletion, insertion, and grapheme-containing text arrive in a rapid ordered sequence
- **THEN** the final text, cursor boundary, selection, autocomplete state, and history state SHALL match sequential Pi input semantics
- **AND** no byte sequence, Unicode grapheme, or editing action SHALL be lost, split, duplicated, or reordered by presentation coordination

#### Scenario: Navigate an active menu
- **WHEN** a selector, menu, dialog, or replacement input surface receives repeated navigation keys before presentation catches up
- **THEN** every navigation action SHALL update the focused surface in order
- **AND** the next eligible presentation SHALL show its newest selection and instructions without painting each superseded selected row
- **AND** activation or cancellation SHALL apply to the selection established by all preceding input

#### Scenario: Submit after a burst
- **WHEN** text or navigation input is followed by submit, activation, cancellation, or interruption while input presentation is pending
- **THEN** all preceding input SHALL be applied before that control action
- **AND** the action SHALL run exactly once against the resulting current state
- **AND** no delayed intermediate presentation SHALL overwrite the post-action surface

#### Scenario: Type while streaming presentation is pending
- **WHEN** keyboard input arrives while streamed transcript output has a coalesced frame pending
- **THEN** keyboard processing and its current-state presentation SHALL preempt that stream deadline
- **AND** the later stream presentation SHALL include the already-applied keyboard state rather than restoring an older frame

#### Scenario: Receive an input sequence outside the safe coordination grammar
- **WHEN** terminal protocol input, an extension-owned handler, a custom surface, or an unrecognized escape sequence cannot be proven safe to coordinate as a burst
- **THEN** the shell SHALL flush preceding accepted input and deliver that sequence conservatively in order
- **AND** it SHALL NOT guess, split, combine, discard, or postpone the sequence behind a cadence timer

### Requirement: Comparative input responsiveness has independent evidence
Keyboard responsiveness acceptance SHALL use isolated bare-`a1`, `a1 pi`, and untouched pinned-Pi producers with equivalent terminal geometry, prepared state, input sequence, scheduler controls, and warmed execution. Evidence SHALL identify input receipt, semantic application, presentation request, composition, terminal write, highest presented input revision, pending-frame depth, and accepted-but-unpresented backlog for ordinary typing, rapid editing, submit, menu navigation, replacement surfaces, long transcripts, and concurrent streaming.

Deterministic ordering, scheduling, backlog, frame-count, stable-work, and terminal-paint budgets SHALL be automated gates. Same-run monotonic first-state and final-state input-to-paint distributions SHALL be recorded for diagnosis and comparison but SHALL NOT be the sole automated verdict. Exact-artifact comparison in Windows Terminal against `a1 pi` SHALL remain authoritative for perceived responsiveness.

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
