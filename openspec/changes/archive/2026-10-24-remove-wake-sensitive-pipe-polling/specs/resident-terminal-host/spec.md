## ADDED Requirements

### Requirement: Windows resident transport readiness is completion-driven

On Windows, resident endpoint connection admission and frame transfer SHALL use bounded operating-system waits and overlapped completion rather than sleep-based pipe readiness polling. Readiness progress SHALL NOT depend on a successful or effective multimedia timer-period request. A pending read SHALL NOT serialize an independent write on the same connection. The transport SHALL preserve the existing owner-only admission, peer verification, first-instance protection, non-inherited custody, generation-1 frame bounds, reliable control ordering, latest-surface replacement, and slow-peer isolation. Unix endpoint semantics SHALL remain unchanged.

#### Scenario: An idle connection receives interactive traffic under coarse timers

- **WHEN** an existing Windows resident connection receives input or a surface after an idle period and its process has no effective short timer-period request
- **THEN** the corresponding pipe operation SHALL progress from operating-system completion without waiting for a periodic readiness sleep
- **AND** other peers and tab children SHALL retain independent progress

#### Scenario: One direction is waiting for data

- **WHEN** a Windows connection has a pending read and its owner admits a frame for writing
- **THEN** the write SHALL progress independently of that read
- **AND** admitted frame bytes SHALL retain their original order

#### Scenario: A peer sends only part of its handshake

- **WHEN** a Windows peer supplies only part of its first frame's length prefix or body
- **THEN** the complete handshake SHALL remain bounded by its absolute four-second deadline rather than a first-byte readiness check
- **AND** expiry SHALL fail only that connection after safely cancelling and draining its pending operation

#### Scenario: Shutdown races with completion

- **WHEN** timeout, peer disconnect, or owning-connection shutdown races with an overlapped completion
- **THEN** the owner SHALL resolve or cancel and drain every affected operation before releasing its buffers, events, or final handle reference
- **AND** operation-scoped cancellation SHALL NOT inadvertently cancel an independent operation or another peer's connection

#### Scenario: A new client joins after a simulated wake gap

- **WHEN** a simulated long attach clock gap occurs and a new client subsequently connects while prior connections remain live
- **THEN** both existing and new connections SHALL continue completion-driven transfer under their normal ownership and queue bounds
- **AND** the gap SHALL NOT authorize process restart, prompt replay, or replacement of a live session writer

### Requirement: Wake responsiveness observations separate local completion from physical presentation

The resident host SHALL provide opt-in, bounded, asynchronous, payload-free observations that identify attach wake-gap/repaint events and local monotonic transport and outer-write completion durations. Normal pending-read idle time SHALL NOT by itself be classified as a delivery-latency fault. Derived latency evidence SHALL use causally matched events and SHALL reject invalid or clock-discontinuity-crossing samples. Diagnostic pressure SHALL drop only observations with explicit loss accounting, never stall terminal I/O. Observation fields SHALL be additive and SHALL contain no terminal content, input text, prompts, transcripts, credentials, or environment values.

#### Scenario: Attach detects one long clock gap

- **WHEN** attach detects one qualifying long gap and then returns to ordinary ticks
- **THEN** it SHALL retain its existing one-shot complete repaint behavior and emit the associated opt-in wake/repaint observation
- **AND** it SHALL NOT repeatedly repaint solely because of that same gap or restart a resident process

#### Scenario: Wall time changes while a trace is active

- **WHEN** wall-clock time moves discontinuously or a wake gap separates observation epochs
- **THEN** local completion durations SHALL remain monotonic
- **AND** derived latency percentiles SHALL exclude invalid or cross-discontinuity samples instead of treating them as delivery evidence

#### Scenario: Observation output falls behind

- **WHEN** the opt-in observation queue reaches its existing bound
- **THEN** terminal transfer SHALL continue without waiting for diagnostics
- **AND** the next admitted observation SHALL report diagnostic loss without including terminal payloads

#### Scenario: An automated wake-gap fixture passes

- **WHEN** simulated-gap and transport fixtures pass without a physical sleep/wake run
- **THEN** the result SHALL be described as simulated-gap and transport evidence only
- **AND** it SHALL NOT claim physical wake recovery or equate outer-write completion with pixels presented by the terminal
