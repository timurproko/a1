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
- **AND** an A1-owned clipboard read ordered after the copy SHALL wait only within the declared copy deadline and SHALL NOT silently read the previous value after a known copy failure

#### Scenario: Another surface owns Ctrl+C
- **WHEN** the prompt has selection precedence, a modal or replacement surface owns input, or there is no copyable transcript selection
- **THEN** the transcript-copy path SHALL NOT steal `Ctrl+C` from its existing handler
- **AND** prompt editing, cancellation, and comparison-profile behavior SHALL remain unchanged

#### Scenario: Session ends with a copy pending
- **WHEN** the session is replaced or disposed while copy preparation or delivery is pending
- **THEN** A1 SHALL cancel pending work, bound resource cleanup, and restore terminal state
- **AND** old-session callbacks SHALL NOT issue new clipboard or terminal writes, mutate the new session, or keep the process alive indefinitely
- **AND** cancellation SHALL NOT claim to undo a clipboard write already completed by the operating system

### Requirement: Response-copy freeze acceptance includes stalled delivery and physical evidence
Response-copy acceptance SHALL combine deterministic fault-injection evidence with user-controlled physical-terminal testing of the exact candidate. Automated evidence SHALL distinguish input receipt, selected-text preparation, selection-clearing presentation, transport submission/completion, timer progress, and terminal output; it SHALL NOT treat an unresolved asynchronous clipboard promise alone as proof of a whole-UI freeze. Diagnostic records SHALL be bounded and omit selected text, clipboard contents, and encoded payloads.

#### Scenario: Exercise the deterministic freeze matrix
- **WHEN** response-copy regression evidence runs
- **THEN** it SHALL cover cold and warm small copies, repeated distinct copies, long selections, long sessions, streaming overlap, clipboard contention/failure/non-settlement, delayed terminal submission, subsequent input, and disposal
- **AND** assertions SHALL fail event-loop monopolization, blocked subsequent input, unbounded pending work, stale deliveries, incorrect text, and incomplete terminal restoration
- **AND** deadline/ordering gates SHALL use controlled scheduling rather than shared-CI wall-clock latency alone

#### Scenario: Accept the exact candidate physically
- **WHEN** the candidate is tested in the user's terminal with repeated selected-response `Ctrl+C` while idle and while the agent works
- **THEN** copied text SHALL be checked by pasting into a separate application and the UI SHALL remain immediately usable without Esc or another recovery action
- **AND** the exact build, terminal/version, local or remote topology, geometry, transport route, workload, and acceptance result SHALL be recorded

#### Scenario: Physical copying still freezes
- **WHEN** the user observes another copy-triggered freeze despite passing automated checks
- **THEN** acceptance SHALL fail and the implementation SHALL remain unaccepted
- **AND** suggesting a recovery shortcut SHALL NOT count as fixing or accepting the behavior
