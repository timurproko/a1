## Context

See `proposal.md` for the report and scope. The implementation trace at planning base `bd390775` is:

```text
owned transcript selection + Ctrl+C
  --> viewport controller: selectedText, clearSelection, requestRender
  --> shell pre-input route: UTF-8/base64 encoding
  --> runtime.writeControl: underlying terminal.write(OSC 52)
  --> terminal clipboard handling
```

The response route bypasses the prompt's `writeSystemClipboardText` queue. That queue's missing timeout is therefore not a demonstrated cause. `TranscriptViewport.selectedText` also slices all selectable document rows before extracting a selected range; selection clearing can trigger presentation work. These are concrete investigation sites, not proof that one of them produced the reported freeze. No live process or terminal trace was captured, and the user did not test Esc. Do not recast that absence as a requirement for the user to diagnose or recover the UI.

This crosses selection, input dispatch, clipboard delivery, terminal ownership, and lifecycle boundaries and needs a design despite its narrow user action. Reconcile the implementation base with `keep-streaming-ui-responsive-during-selection`, accepted selection endpoints, and current input/presentation changes before editing shared code. This stream does not own their general rendering optimizations.

## Goals / Non-Goals

**Goals:**
- Decouple the UI's progress from clipboard completion, including first use, contention, and never-settling delivery.
- Make request lifetime, payload size, preparation slices, ordering, and cleanup bounded and testable.
- Preserve the semantic input-boundary snapshot and existing copy/selection behavior while attributing both application stalls and terminal-side stalls accurately.

**Non-Goals:**
- Guarantee successful clipboard delivery when the OS denies access, or claim control over an externally suspended/unresponsive terminal.
- Change shortcuts, require recovery keys, pause streaming, clear selections early to conceal drag lag, or redesign all clipboard features.
- Patch installed Pi/native dependencies, add another writer to the UI terminal, or modify `a1 pi` behavior.
- Treat merely wrapping synchronous work in a promise, changing OSC terminators without evidence, or adding a timeout to the unrelated prompt queue as a demonstrated fix.

## Decisions

### 1. Attribute the copy phases before claiming the root cause

Extend the existing bounded input/presentation diagnostics with request identity and phase durations: receipt, source-range capture, extraction, selection-clear request/composition/write, encoding, transport selection/submission/settlement, timeout, and teardown. Record monotonic timer progress, pending depth, payload byte count, and transport/result categories, never copied text, base64, private transcript rows, or clipboard reads for telemetry.

Use generated short response text first: the report does not depend on a large selection. Compare idle/streaming, short/long sessions, cold/warm paths, and repeated distinct selections. Fault seams must exercise both an unresolved asynchronous delivery and real synchronous preparation pressure; the former alone cannot prove event-loop isolation. A terminal replay proves grammar/cells, not physical terminal responsiveness. If the event loop remains healthy while visible output stops, investigate the terminal/control-sequence boundary rather than label it an application deadlock. Do not make a new user reproduction a prerequisite for deterministic testing.

Alternative rejected: assume all clipboard freezes originate in native code, or accept unchanged terminal behavior because a mocked write returned promptly.

### 2. Capture copy intent immediately and prepare only selected content

Keep the controller authoritative for input ownership. At the copy input boundary capture selection endpoints, selection/content revision, and stable selected-row/source references with bounded metadata; clear the selection and request its normal damage repaint independently of clipboard completion. Preserve prompt-selection precedence and consume exactly the copy key. Do not clear a newer selection from an asynchronous callback.

Replace the whole-document array slice with selected-range access. References must preserve the original selected content across streaming/reflow without retaining entire obsolete document graphs. Extract grapheme-safe plain text using existing semantic boundaries, not a second ANSI/selection model. Retain only selected source data within the copy budget. Chunk costly extraction/encoding with event-loop yields and cancellation checks; isolate any indivisible supported operation that exceeds the interaction slice target. Keep expensive unchanged block formatting out of the copy-clear frame and reuse established rows, without taking over the broader renderer project.

Use a 5 ms local preparation-slice target, with deterministic row/byte-work gates and scheduled-yield tests in CI rather than a shared-machine 5 ms assertion. Count actual UTF-8 bytes incrementally. Reject oversize requests before transport submission with feedback, never copy a prefix. Test a long single line as well as many rows; yielding only between rows is insufficient if one row monopolizes the loop.

Alternative rejected: defer `selectedText()` itself and read mutable selection later; this can copy a new range or newly streamed text. A synchronous snapshot of the whole transcript is also not isolation.

### 3. Give response copies one bounded delivery coordinator

Use an owned session-lifecycle coordinator with monotonically increasing request identities and explicit outcomes: delivered, submitted-unverified, failed, timed-out, superseded, or canceled. Keep at most one delivering request and one newest pending request. A new request replaces an older not-yet-delivered pending request and releases its payload. Do not start a newer delivery while an older one can still write. Supersession/cancellation is silent; actionable failures use concise coalesced non-modal status, never one modal/toast backlog per key.

Initial concrete budgets:
- 5,000 ms end-to-end deadline from request admission, including preparation, pending time, and transport startup; the UI never waits synchronously for this deadline.
- At most 16 MiB UTF-8 selected text per request, one active and one pending payload, with bounded source/encoding scratch memory accounted separately and released on settlement.
- At most 64 KiB for a complete terminal clipboard control sequence, including base64 and delimiters, or a lower known terminal capability limit. Larger text needs a supported non-terminal destination or an explicit size failure.
- 250 ms asynchronous cleanup grace after cancellation/timeout; if a delivery resource cannot be confirmed stopped, quarantine it, release UI references, and fail subsequent writes promptly rather than risk stale overwrite or grow abandoned workers.

A timeout must stop or fence actual side effects, not just win a `Promise.race`. Confirm termination/settlement before switching transport or delivering a newer request. Late callbacks are identity/epoch checked. Already completed OS writes cannot be undone; don't promise transactional rollback of them. Retry only known-safe transient failures within the original deadline, with bounded attempts; never blindly replay an uncertain successful write.

Coordinate the transcript-copy result with the shell's existing copy-before-paste barrier. An A1-owned paste immediately after copying waits asynchronously for that request only within its remaining deadline. On known failure it reports/skips rather than pasting the prior clipboard value as though copying succeeded. Keep normal terminal-provided paste behavior and prompt copy/cut semantics unchanged; compatibility tests include their interleaving with response copies so a new barrier cannot strand them.

Alternative rejected: an unbounded FIFO promise chain, concurrent native and terminal writes, or ignoring a timed-out native operation while it can later overwrite newer content.

### 4. Choose a destination-correct transport and isolate blocking clipboard work

On supported local hosts, prefer clipboard delivery isolated from the UI terminal, using a cancellable child-process boundary around the platform/native adapter. A child is preferable to a worker running native code whose cancellation cannot be proven. Keep clipboard payloads off command lines and temporary files: use private stdin/IPC, bounded messages, `windowsHide`, and no inherited UI stdout/stderr. The helper must not acquire another terminal writer. Bound spawn failures, hangs, output, memory, and teardown; lazily start it and include cold packaged startup evidence.

Transport selection is explicit about local versus remote destinations. On SSH or another remote/multiplexed route whose desired destination is the user's terminal clipboard, do not choose a remote native clipboard just because a binding loads. Preserve the compatible OSC 52 route through the existing single terminal writer, with correct atomic framing, capability-aware limits, and no synchronous clipboard query. Do not inject control bytes inside synchronized rendering transactions or interleave partial OSC payloads with frame bytes. A lower terminal limit wins over the global limit; unsupported/uncertain unsafe routes fail non-modally instead of emitting oversized traffic.

Prefer one transport, not native plus OSC 52 on every copy. Fallback is allowed only after a known failure with the earlier side effect stopped and within the original request deadline. Terminal submission generally lacks acknowledgment: report at most submitted-unverified, not verified clipboard success. Do not repeatedly retransmit merely because acknowledgment is absent.

The terminal fallback must have a verified non-blocking submission path under the supported host's output behavior; a JS deadline cannot interrupt a synchronous terminal write. Attribute and remediate copy-specific output blocking at the owned boundary without creating a second writer. If physical-terminal testing shows that a route itself stalls the terminal, do not declare it safe merely because Node remains live; select the safe local path where destination-correct or reject that unsupported route with feedback. External terminal suspension remains an explicit limitation, not an Esc-based workaround or an excuse to accept the reported regression.

Alternative rejected: always use the local OS clipboard (wrong destination remotely), always use OSC 52 (keeps clipboard handling on the UI terminal), or bypass the runtime with direct helper writes to the TTY.

### 5. Make isolation, exact text, and physical behavior acceptance gates

Deterministic tests use controlled schedules and fault injection to prove input/render/timer progress before transport resolution, bounded preparation slices and pending bytes, deadline settlement, termination fencing, exact content and ownership, and no late writes after disposal. Include local and remote routing, native unavailability, denied/busy clipboard, stuck startup/delivery, unexpected helper exit, terminal backpressure, and malformed/unsupported transport conditions. Replay full frames plus copy controls to verify completed control sequences, selection-clear damage, no stale highlight, and restored terminal state.

Payload fixtures include small words/sentences, forward/reverse multiline selections, ANSI, links, emoji/combining/wide text, rail/sticky/transient-tail boundaries, long single lines, 16 MiB boundary/rejection, and terminal encoded-size boundaries. Compare identical small selections over short/long history using inspected-row and preparation counters. Test copy followed by typing, wheel reports, Ctrl+V, another selection/copy, overlay entry, session switch, and shutdown.

Physical acceptance uses the exact built bare-A1 candidate in the user's terminal, first idle then streaming, and verifies copied values in another application. Start with at least 100 small distinct copy cycles plus large/multiline cases; absence of failure in 100 cycles is supporting evidence, not statistical proof or a substitute for user acceptance. Record input-to-paint p50/p95/max and visible status gaps; local targets are p95 at most 50 ms and no copy-induced visible working-indicator gap above two nominal 80 ms periods in the declared workload. Include cold startup and applicable clipboard contention. A user-observed freeze fails acceptance even if budgets pass. Compare `a1 pi` in the equivalent mode only as an unchanged control, not as interchangeable terminal-owned selection.

Alternative rejected: assert only the emitted base64 or only final cells, or require the user to press Esc to pass acceptance.

## Risks / Trade-offs

- **[The exact reported blocking phase is unknown]** -> Preserve evidence versus hypotheses; baseline both event-loop and physical-terminal behavior before selecting remediation details. The copy coordinator is not by itself proof of fixing the freeze.
- **[Helper startup adds clipboard latency]** -> Lazy bounded reuse after successful operations; include startup in the deadline and never delay UI interaction for helper warmup.
- **[Timeout races a real clipboard side effect]** -> Fence the old delivery before any later submission; quarantine uncertain resources, and distinguish submission from verified completion.
- **[Payload limits reject formerly attempted oversized OSC writes]** -> Prefer the destination-correct non-terminal transport for larger copies; explicit size failure is safer than hanging or silently truncating. Test and document exact limits.
- **[Deferred preparation changes selected content or retains old history]** -> Immutable range snapshot, bounded selected references, identity checks, and reflow/streaming/lifecycle tests.
- **[Existing copy/paste paths interact]** -> Integrate only the ordering seam required for response copies and test prompt/cut/paste and `/copy` unchanged; no unrelated clipboard redesign.
- **[A terminal or OS can hang outside A1's control]** -> Isolate OS clipboard work, validate physical transport behavior, and state platform limitations honestly; never certify a reproducibly freezing route or prescribe recovery keys as the fix.

## Migration Plan

1. Capture a generated baseline and compatibility map on the fresh implementation base, without changing other pending change artifacts.
2. Add exact-range bounded preparation, the coordinator, isolated delivery and safe terminal fallback, plus required copy-before-paste/lifecycle seams.
3. Validate deterministic fault/text/terminal evidence and cold packaged helper resolution; retain payload-free evidence with the candidate.
4. Obtain exact-artifact physical acceptance, including repeated ordinary Ctrl+C copying without recovery actions. No persisted session or settings migration is required.
5. Roll back by reverting the owned copy-delivery change and helper integration; do not alter installed Pi files or stored conversation data. Record that rollback can restore the original freeze risk rather than claiming it as a solution.

## Open Questions

- The report's terminal name/version, local/remote topology, freeze duration, and whether the process or only terminal presentation stops are unknown. Collect these in baseline/acceptance evidence if available; they do not gate creating this plan or justify assigning an unproven root cause.
- The exact phase and terminal capability combinations responsible for the occurrence remain to be measured by task 1. The chosen boundaries and failure policy apply regardless; any needed expansion beyond copy-specific remediation requires a separate scope decision rather than silently absorbing general renderer work.
