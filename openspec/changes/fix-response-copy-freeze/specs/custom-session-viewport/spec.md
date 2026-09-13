## ADDED Requirements

### Requirement: Copying a selected response does not suspend the UI
When bare A1 owns a nonempty agent-response selection and receives `Ctrl+C`, it SHALL consume that key as a copy action, capture the selected semantic text at that input boundary, and clear the selection through the existing selection-clearing behavior. Clipboard completion SHALL NOT gate subsequent input handling, scrolling, rendering, animation, or agent-event processing. Copy SHALL NOT pause the agent, change follow/detach state, or require Esc, another recovery key, a focus change, or restart to resume normal use.

Copy preparation SHALL have bounded uninterrupted work and SHALL NOT traverse or duplicate unrelated off-screen transcript content. Large supported selections SHALL yield during expensive preparation rather than monopolize the UI event loop. Clipboard unavailability SHALL be a recoverable copy failure, not a UI freeze.

#### Scenario: Copy an ordinary response while idle
- **WHEN** the reader selects agent-response text and presses `Ctrl+C`
- **THEN** A1 SHALL initiate copying that text and clear the selection without waiting for clipboard delivery
- **AND** immediately following typing and scrolling SHALL be handled normally without a recovery action

#### Scenario: Copy during active output
- **WHEN** the reader copies selected response text while the agent streams and a working indicator is visible
- **THEN** input, visible animation, and eligible streamed frames SHALL continue progressing while copy delivery is pending
- **AND** the copy action SHALL NOT cancel the agent or detach a followed viewport

#### Scenario: Copy a small range from a long session
- **WHEN** the same small visible response range is copied in short and long settled sessions
- **THEN** copy preparation SHALL inspect only the selected content and the bounded metadata needed to identify it
- **AND** unrelated transcript length SHALL NOT introduce additional copy preparation or unchanged-content formatting

#### Scenario: Prepare a large supported selection
- **WHEN** a selected response requires preparation beyond one bounded interaction slice
- **THEN** later input and animation SHALL receive processing opportunities before preparation completes
- **AND** the eventual copy SHALL use the original selected-text snapshot rather than newer streaming or reflowed content

### Requirement: Response-copy delivery is bounded and recovers automatically
Every response-copy request SHALL have a finite declared deadline and a bounded payload/resource policy. Busy, missing, denied, failed, or non-settling clipboard transports SHALL NOT retain an unbounded queue or permanently prevent later copy attempts. A1 SHALL automatically settle failed requests and release or quarantine stalled delivery resources without user intervention. A known delivery failure or rejected payload SHALL produce concise non-modal feedback without revealing copied text or claiming success.

Where copying uses a terminal protocol without delivery acknowledgment, submission SHALL NOT be represented as verified clipboard success. Copy SHALL preserve the intended clipboard destination: a remote session SHALL NOT silently substitute the remote machine's clipboard for the user's terminal clipboard. Unsupported payloads SHALL be rejected explicitly rather than silently truncated, partially copied, or sent as an unbounded terminal control sequence.

#### Scenario: Clipboard transport does not settle
- **WHEN** a copy transport remains pending past the declared deadline
- **THEN** the request SHALL expire automatically with non-modal failure feedback
- **AND** the UI SHALL remain usable throughout the wait and after expiration
- **AND** later requests SHALL use a recovered safe transport or fail promptly rather than wait behind that expired request

#### Scenario: Repeated copies overlap
- **WHEN** several distinct response selections are copied before an earlier delivery completes
- **THEN** pending requests and retained payload bytes SHALL stay within declared bounds
- **AND** the newest accepted request SHALL supersede any older request that has not started delivery
- **AND** an older request SHALL NOT be submitted after a newer request or overwrite a newer completed copy through a late A1-controlled delivery

#### Scenario: Recover a failed transport
- **WHEN** a copy fails and a supported transport becomes usable again
- **THEN** a subsequent copy SHALL be able to succeed without restarting the UI
- **AND** stale completion or timeout callbacks SHALL NOT alter the newer request's outcome

#### Scenario: No supported destination or payload size
- **WHEN** no usable transport can reach the intended clipboard or the selected payload exceeds its supported limit
- **THEN** A1 SHALL report that copying could not be completed without opening a modal dialog
- **AND** it SHALL NOT silently copy a prefix, write to a different host's clipboard, or suspend normal interaction

#### Scenario: Submit through an unacknowledged terminal protocol
- **WHEN** the supported delivery path can acknowledge only terminal submission rather than actual clipboard contents
- **THEN** any feedback SHALL distinguish submission from verified delivery
- **AND** A1 SHALL NOT wait indefinitely for an acknowledgment the protocol does not provide

### Requirement: Responsive response copying preserves text and input ownership
Response copying SHALL preserve the accepted selected-text semantics: complete graphemes, forward/reverse equivalence, source newline boundaries, and exclusion of ANSI controls, viewport padding, rail/control glyphs, sticky duplicates, dock rows, and transient working-status content. Clearing or reflowing the display after the copy action SHALL NOT change its captured content.

The change SHALL preserve prompt-selection precedence, copy/cut/paste semantics, `/copy`, and Ctrl+C behavior when no copyable transcript selection exists. Modal and replacement surfaces SHALL retain their input ownership. The `a1 pi` comparison path and installed Pi packages SHALL remain unchanged.

#### Scenario: Copy a styled multiline response
- **WHEN** a response selection includes styled text, wide or combining graphemes, and multiple source rows
- **THEN** the clipboard payload SHALL equal the accepted semantic selection in either drag direction
- **AND** no terminal styling, viewport chrome, or transient working content SHALL enter the payload

#### Scenario: Input immediately follows copy
- **WHEN** `Ctrl+C` for a selected response is immediately followed by typing, scrolling, or a paste action
- **THEN** the copy key SHALL NOT leak into agent cancellation or the prompt
- **AND** following actions SHALL preserve receipt order and their existing semantics
- **AND** a paste admitted while that copy is pending SHALL wait only within the copy's remaining deadline and its own paste deadline, and SHALL fail that dependent paste rather than silently insert the previous clipboard value if the copy fails
- **AND** a later independent paste SHALL be able to acquire the current clipboard normally instead of inheriting the completed copy failure indefinitely

#### Scenario: Another surface owns Ctrl+C
- **WHEN** the prompt has selection precedence, a modal or replacement surface owns input, or there is no copyable transcript selection
- **THEN** the transcript-copy path SHALL NOT steal `Ctrl+C` from its existing handler
- **AND** prompt editing, cancellation, and comparison-profile behavior SHALL remain unchanged

#### Scenario: Session ends with a copy pending
- **WHEN** the session is replaced or disposed while copy preparation or delivery is pending
- **THEN** A1 SHALL cancel pending work, bound resource cleanup, and restore terminal state
- **AND** old-session callbacks SHALL NOT issue new clipboard or terminal writes, mutate the new session, or keep the process alive indefinitely
- **AND** cancellation SHALL NOT claim to undo a clipboard write already completed by the operating system

### Requirement: Standalone prompt pasting does not suspend the UI
When the ordinary bare-A1 prompt owns `Ctrl+V`, A1 SHALL keep subsequent input, scrolling, rendering, visible animation, and agent-event processing responsive throughout paste acquisition, preparation, and insertion. This guarantee SHALL apply independently of any preceding A1 copy, including clipboard content supplied by another application. Paste SHALL NOT pause the agent, unexpectedly change follow/detach state, or require Esc, a focus change, another recovery key, or restart.

Supported native clipboard reads and terminal-provided bracketed paste SHALL preserve their existing routing distinction. A nonempty payload supplied by the terminal SHALL be processed as that payload without a duplicate native clipboard read. Blocking format detection, path inspection, image conversion, text classification, or insertion/presentation work SHALL NOT monopolize the UI event loop merely because acquisition was asynchronous. Existing text normalization, chip behavior, image validation, and attachment limits SHALL remain authoritative.

#### Scenario: Paste text copied outside A1
- **WHEN** the reader copies ordinary text in another application and presses Ctrl+V in the A1 prompt without an earlier A1 copy
- **THEN** the text SHALL be inserted once through the accepted paste policy
- **AND** later input and eligible UI frames SHALL progress before any slow clipboard acquisition or preparation completes

#### Scenario: Paste while the agent works
- **WHEN** the reader pastes into the ordinary prompt during streamed output
- **THEN** editor input, viewport scrolling, visible working animation, and streamed content SHALL continue progressing
- **AND** the paste SHALL NOT submit the prompt, cancel the agent, or detach a followed viewport by itself

#### Scenario: Receive terminal-owned paste
- **WHEN** the terminal consumes Ctrl+V and supplies a nonempty bracketed paste, including valid split framing across input chunks
- **THEN** A1 SHALL insert or classify that supplied content exactly once without rereading the native clipboard
- **AND** delimiter-like payload bytes SHALL remain opaque text under the existing framing policy rather than become commands or pointer input
- **AND** expensive handling after receipt SHALL remain bounded and responsive

#### Scenario: Prepare large text, paths, or an image
- **WHEN** supported pasted content needs expensive text classification, path inspection, or image preparation
- **THEN** input and visible animation SHALL receive processing opportunities while that work runs
- **AND** completion SHALL retain the accepted text/URL/path/image representation, exact expanded text, and existing image safety limits
- **AND** plain-text acquisition SHALL NOT display a misleading screenshot chip merely because its content is still unknown

### Requirement: Paste acquisition and preparation recover within bounded lifetimes
Every A1-owned paste request SHALL have a finite declared end-to-end deadline covering any prerequisite write wait, acquisition, preparation, and insertion. Concurrent requests, retained payload bytes, helpers, and pending insertions SHALL stay within declared bounds. Busy, denied, missing, non-settling, or failed readers/preparers SHALL settle automatically with concise non-modal feedback for actionable failures. Empty clipboard content SHALL remain a no-op rather than a modal error.

A timed-out or canceled operation SHALL NOT retain a permanent read/write barrier, block a safe later clipboard action, or mutate the editor through late completion. Stalled executors whose termination is unconfirmed SHALL be quarantined within the resource budget, not silently replaced with unlimited new executors. Unsupported or oversized content SHALL be rejected explicitly rather than partially inserted or silently truncated. Failure cleanup SHALL preserve unrelated draft text and later edits.

#### Scenario: Standalone clipboard read stalls
- **WHEN** Ctrl+V starts a clipboard read that does not settle
- **THEN** the UI SHALL remain usable while the read is pending and the request SHALL expire automatically at its deadline
- **AND** its pending insertion SHALL be removed or settled through the accepted failure presentation without losing the reader's draft
- **AND** no recovery key SHALL be needed

#### Scenario: A later paste succeeds after failure
- **WHEN** an earlier copy or paste has failed and the reader independently pastes available content again
- **THEN** the new request SHALL perform a fresh supported acquisition without restarting A1 or requiring a successful intermediate copy
- **AND** failure state from the older request SHALL NOT be reused as a permanent rejection of the new request

#### Scenario: Preparation stalls after a successful read
- **WHEN** clipboard acquisition finishes but path inspection, conversion, or another preparation step stops progressing
- **THEN** the same end-to-end deadline SHALL still bound the paste operation
- **AND** the editor and agent UI SHALL remain responsive instead of waiting synchronously for preparation or teardown

#### Scenario: Clipboard is empty or unusable
- **WHEN** the clipboard is empty, access is denied, or no supported acquisition route is available
- **THEN** A1 SHALL leave unrelated prompt content unchanged and settle the paste without a modal dialog
- **AND** empty content SHALL be a no-op while an actionable access or transport failure SHALL receive concise feedback
- **AND** A1 SHALL NOT substitute a different host's clipboard for the intended source

### Requirement: Pending pastes preserve distinct edits and input ownership
Each admitted paste SHALL preserve its invocation order and reserved insertion or replacement position while acquisition/preparation is pending. Distinct accepted pastes SHALL NOT use response copy's newest-pending supersession policy. Capacity rejection SHALL be explicit; accepted actions SHALL NOT be silently dropped, duplicated, or reordered by differing completion speeds. Typing, selection changes, undo/redo, and later clipboard actions SHALL continue to use their existing editing semantics.

Modal and replacement surfaces SHALL retain ownership of their paste input rather than being intercepted by the ordinary-prompt paste path. Session replacement, disposal, removal of a pending insertion, or another accepted cancellation action SHALL invalidate that request so late results cannot restore canceled content, overwrite subsequent edits, or act on a new session. The pinned `a1 pi` behavior SHALL remain unchanged.

#### Scenario: Two pastes complete out of order
- **WHEN** two distinct pastes are admitted with intervening typing and their preparations finish in reverse order
- **THEN** each result SHALL replace only its own reserved insertion, preserving invocation order and the intervening text
- **AND** neither paste SHALL be discarded merely because a newer paste was requested

#### Scenario: Edit or undo while a paste is pending
- **WHEN** the reader edits around a pending paste or removes/undoes its reserved insertion before completion
- **THEN** unrelated edits SHALL remain intact
- **AND** a canceled insertion SHALL NOT reappear or replace the current selection when its old result arrives

#### Scenario: Exceed concurrent paste capacity
- **WHEN** a new paste would exceed the declared request or payload budget
- **THEN** A1 SHALL reject that new request non-modally without silently removing an already accepted paste
- **AND** releasing completed or canceled resources SHALL permit later safe requests without restart

#### Scenario: Replace or close the session while pasting
- **WHEN** a session is replaced or disposed during clipboard reading or preparation
- **THEN** A1 SHALL invalidate pending insertions and bound resource cleanup while restoring terminal state
- **AND** late callbacks SHALL NOT write to the terminal, insert text/images into the new session, or keep shutdown waiting indefinitely

### Requirement: Clipboard freeze acceptance includes stalled delivery and physical evidence
Copy and paste acceptance SHALL combine deterministic fault-injection evidence with user-controlled physical-terminal testing of the exact candidate. Automated evidence SHALL distinguish input receipt/framing, selected-text preparation, selection-clearing presentation, clipboard write/read submission and completion, prerequisite waits, paste classification/conversion, editor insertion/presentation, timer progress, and terminal output; it SHALL NOT treat an unresolved asynchronous clipboard promise alone as proof of a whole-UI freeze. Diagnostic records SHALL be bounded and omit selected/pasted text, clipboard contents, paths, images, and encoded payloads. Copy-only, paste-only, and combined flows SHALL receive separate evidence; passing one SHALL NOT establish that the others are fixed.

#### Scenario: Exercise the deterministic freeze matrix
- **WHEN** clipboard regression evidence runs
- **THEN** it SHALL cover cold/warm copy-only, standalone paste-only, and combined operations; repeated distinct requests; long text/selections/sessions; URL/path and existing image cases; native and terminal-provided paste; streaming overlap; write/read/preparation contention, failure and non-settlement; delayed terminal submission; subsequent input; and disposal
- **AND** assertions SHALL fail event-loop monopolization, blocked subsequent input, unbounded pending work, stale deliveries, incorrect text, and incomplete terminal restoration
- **AND** deadline/ordering gates SHALL use controlled scheduling rather than shared-CI wall-clock latency alone

#### Scenario: Accept the exact candidate physically
- **WHEN** the candidate is tested in the user's terminal with repeated selected-response Ctrl+C, independent Ctrl+V using content copied outside A1, and combined copy/paste while idle and while the agent works
- **THEN** copied text SHALL be checked in a separate application, pasted content SHALL be checked in the A1 prompt, and the UI SHALL remain immediately usable throughout both shortcuts without Esc or another recovery action
- **AND** the exact build, terminal/version, local or remote topology, geometry, transport route, workload, and acceptance result SHALL be recorded

#### Scenario: Physical copying or pasting still freezes
- **WHEN** the user observes another copy- or paste-triggered freeze despite passing automated checks
- **THEN** acceptance SHALL fail and the implementation SHALL remain unaccepted
- **AND** suggesting a recovery shortcut SHALL NOT count as fixing or accepting the behavior
