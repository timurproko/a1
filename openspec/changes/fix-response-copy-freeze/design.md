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

The user subsequently reported that Ctrl+V also appears to freeze the UI and approved expanding this change to both shortcuts. Inspection for this revision at `619c40b7` identifies two paste routes:

```text
A1 receives Ctrl+V
  --> ordinary editor reserves a paste insertion
  --> shell waits for its relevant prior clipboard write
  --> clipboard worker: format detection / image or text read / fallback
  --> image preparation, or text / URL / path classification
  --> reserved insertion replacement and presentation

terminal consumes Ctrl+V
  --> terminal-supplied bracketed text (possibly split across chunks)
  --> owned framing / classification / editor insertion / presentation
```

`ImagePreparationClient` already has a 15,000 ms deadline, an eight-request limit, and isolated worker work. `system-clipboard.ts` bounds command reads to 5,000 ms and 16 MiB, while native-format detection and text reads have different paths. `PromptChipStore.beginPaste` transforms text after the worker result; path classification can perform synchronous filesystem probes. Nonempty terminal-provided paste bypasses native reading and takes its own classification/insertion path. These are candidate blocking phases, not a diagnosed cause; an existing promise, worker, or timeout does not prove responsive completion and cleanup.

This now crosses selection, input dispatch, clipboard write/read delivery, paste preparation/insertion, terminal ownership, and lifecycle boundaries. Reconcile the implementation base with `keep-streaming-ui-responsive-during-selection`, accepted selection endpoints, large-text paste chips, image safety, and current input/presentation changes before editing shared code. This stream does not own their general rendering or paste-feature redesigns. The earlier copy work is unfinished implementation evidence, not acceptance of either shortcut.

## Goals / Non-Goals

**Goals:**
- Decouple the UI's progress from clipboard writes, reads, preparation and insertion, including first use, contention, and never-settling delivery.
- Make request lifetime, payload size, preparation slices, ordering, and cleanup bounded and testable.
- Preserve copy snapshots and paste reservation/undo semantics while attributing application and terminal-side stalls separately for copy-only, standalone paste-only, and combined flows.

**Non-Goals:**
- Guarantee successful clipboard delivery when the OS denies access, or claim control over an externally suspended/unresponsive terminal.
- Change shortcuts, require recovery keys, pause streaming, clear selections early to conceal drag lag, or redesign all clipboard features.
- Patch installed Pi/native dependencies, add another writer to the UI terminal, or modify `a1 pi` behavior.
- Treat wrapping synchronous work in a promise, changing OSC terminators without evidence, or finding an existing worker/timeout as a demonstrated fix. The prompt write queue is relevant to paste prerequisites, but not proven to cause the original response-copy freeze.

## Decisions

### 1. Attribute copy and paste phases before claiming a shared root cause

Extend the existing bounded input/presentation diagnostics with operation kind, request identity, and phase durations. For copy: receipt, source-range capture, extraction, selection-clear request/composition/write, encoding, transport selection/submission/settlement, timeout, and teardown. For paste: key or bracketed-payload receipt/framing, reserved insertion, captured prerequisite wait, format detection, clipboard read, transfer, text/path classification or image preparation, insertion/marker replacement, and resulting composition/write. Record monotonic timer progress, pending depth, payload byte count, and transport/result categories, never copied/pasted text, base64, paths, images, private transcript rows, or diagnostic clipboard reads.

Use generated short response text and short externally supplied paste text first: neither report establishes a large-payload prerequisite. Compare copy-only, paste-only with no A1 copy, and copy-then-paste separately across idle/streaming, short/long sessions, cold/warm paths, and repeated requests. Distinguish A1-owned Ctrl+V acquisition from a terminal that consumes the shortcut and sends bracketed content. Fault seams must exercise both an unresolved asynchronous delivery and real synchronous preparation pressure; the former alone cannot prove event-loop isolation. A terminal replay proves grammar/cells, not physical terminal responsiveness. If the event loop remains healthy while visible output stops, investigate the terminal/control-sequence boundary rather than label it an application deadlock. Do not make a new user reproduction a prerequisite for deterministic testing.

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

Coordinate writes and reads by capturing the relevant predecessor when each operation is admitted, not by consulting a mutable latest promise later. A paste admitted while a copy is pending waits asynchronously for that particular copy only within both the copy's remaining deadline and its own acquisition budget. Failure rejects that dependent paste instead of inserting an old clipboard value as though copying succeeded. Once that transaction settles, a later independent paste starts a fresh acquisition; do not latch a failed copy result as a permanent paste prohibition. Likewise, an expired read cannot remain a write barrier. Fence uncertain write side effects before newer writes, while distinguishing them from read results that only need stale-insertion suppression. Keep prompt copy/cut payload semantics and modal ownership intact; test mixed operations for cycles and stale barriers. Terminal-supplied nonempty paste already owns its payload and never waits for or triggers a redundant native read.

Alternative rejected: an unbounded FIFO promise chain, concurrent native and terminal writes, or ignoring a timed-out native operation while it can later overwrite newer content.

### 4. Choose a destination-correct transport and isolate blocking clipboard work

On supported local hosts, prefer clipboard delivery isolated from the UI terminal, using a cancellable child-process boundary around the platform/native adapter. A child is preferable to a worker running native code whose cancellation cannot be proven. Keep clipboard payloads off command lines and temporary files: use private stdin/IPC, bounded messages, `windowsHide`, and no inherited UI stdout/stderr. The helper must not acquire another terminal writer. Bound spawn failures, hangs, output, memory, and teardown; lazily start it and include cold packaged startup evidence.

Transport selection is explicit about local versus remote destinations. On SSH or another remote/multiplexed route whose desired destination is the user's terminal clipboard, do not choose a remote native clipboard just because a binding loads. Preserve the compatible OSC 52 route through the existing single terminal writer, with correct atomic framing, capability-aware limits, and no synchronous clipboard query. Do not inject control bytes inside synchronized rendering transactions or interleave partial OSC payloads with frame bytes. A lower terminal limit wins over the global limit; unsupported/uncertain unsafe routes fail non-modally instead of emitting oversized traffic.

Prefer one transport, not native plus OSC 52 on every copy. Fallback is allowed only after a known failure with the earlier side effect stopped and within the original request deadline. Terminal submission generally lacks acknowledgment: report at most submitted-unverified, not verified clipboard success. Do not repeatedly retransmit merely because acknowledgment is absent.

The terminal fallback must have a verified non-blocking submission path under the supported host's output behavior; a JS deadline cannot interrupt a synchronous terminal write. Attribute and remediate copy-specific output blocking at the owned boundary without creating a second writer. If physical-terminal testing shows that a route itself stalls the terminal, do not declare it safe merely because Node remains live; select the safe local path where destination-correct or reject that unsupported route with feedback. External terminal suspension remains an explicit limitation, not an Esc-based workaround or an excuse to accept the reported regression.

Alternative rejected: always use the local OS clipboard (wrong destination remotely), always use OSC 52 (keeps clipboard handling on the UI terminal), or bypass the runtime with direct helper writes to the TTY.

### 5. Make isolation, exact text, and physical behavior acceptance gates

Deterministic tests use controlled schedules and fault injection to prove input/render/timer progress before transport resolution, bounded preparation slices and pending bytes, deadline settlement, termination fencing, exact content and ownership, and no late writes after disposal. Include local and remote routing, native unavailability, denied/busy clipboard, stuck startup/delivery, unexpected helper exit, terminal backpressure, and malformed/unsupported transport conditions. Replay full frames plus copy controls to verify completed control sequences, selection-clear damage, no stale highlight, and restored terminal state.

Payload fixtures include small words/sentences, forward/reverse multiline selections, ANSI, links, emoji/combining/wide text, rail/sticky/transient-tail boundaries, long single lines, 16 MiB text boundary/rejection, and terminal encoded-size boundaries. Add standalone paste fixtures for URLs, paths including slow/unavailable filesystem probes, existing valid/invalid image representations, and empty/denied/unavailable clipboard content. Compare identical small copy and paste workloads over short/long history using inspected-row, preparation, and frame counters. Exercise native Ctrl+V and valid split bracketed paste, reverse completion of distinct pastes with intervening typing, copy-to-paste waits, recovery after a failed write/read, marker removal/undo, overlays, session switch, and shutdown. A never-settling read, blocked preparer, or healthy event loop with stalled terminal painting are distinct fault cases.

Physical acceptance uses the exact built bare-A1 candidate in the user's terminal, first idle then streaming. Verify copied values in another application and independently paste external text into A1 with no preceding A1 copy. Start with at least 100 small distinct copy cycles and 100 standalone paste cycles plus combined, large/multiline, and existing image cases; absence of failure in those cycles is supporting evidence, not statistical proof or a substitute for user acceptance. Record subsequent-input-to-paint p50/p95/max, visible status gaps, and copy/paste completion latency separately: the UI must stay responsive even when clipboard/image completion legitimately takes longer. Local interaction targets remain p95 at most 50 ms and no copy- or paste-induced visible working-indicator gap above two nominal 80 ms periods in the declared workload. Include cold startup and applicable clipboard contention; record whether Ctrl+V reached A1 as a key or a terminal-owned paste. A user-observed freeze in either shortcut fails acceptance even if budgets pass. Compare `a1 pi` in the equivalent mode only as an unchanged control, not as interchangeable terminal-owned selection.

Alternative rejected: assert only the emitted base64 or only final cells, or require the user to press Esc to pass acceptance.

### 6. Bound the complete standalone paste lifecycle, not just the preceding copy

Use the existing ordinary-editor paste reservation and chip semantics as the authority. Reserve each admitted paste synchronously at its input position, then perform acquisition and preparation without gating later input. Carry operation/session generation, reservation identity, and the one acquired payload through completion. Apply a result only to its still-live reservation; never replace the current unrelated selection or reinsert canceled content. Preserve existing selection replacement, exact text normalization/expansion, undo/redo, URL/path chips, and image validation/attachment behavior. Empty reads restore the accepted empty-paste state; actionable failure uses non-modal feedback without discarding subsequent edits or falsely presenting unknown text as a screenshot.

Pastes are distinct edits, not competing clipboard values: retain each admitted reservation in input order even when results complete in a different order. Do not reuse copy's newest-pending queue. Retain the existing maximum of eight pending paste requests and one active image-conversion slot, counting canceled-but-unfenced executors against the resource budget. Reject additional admissions explicitly rather than evicting accepted pastes. Bound text payloads to 16 MiB UTF-8 per request across native and terminal-provided routes, or a lower already-declared route limit; enforce byte counts incrementally before oversized joins/transfers/insertion. Retain existing image source limits (20 MiB, 40 million pixels, 32,768 maximum dimension) and attachment/output budgets rather than substituting text limits for images. Account for raw, encoded, prepared, and reserved representations separately; the request count plus per-representation limits must bound total retained memory, not just the visible editor text.

Retain the existing 15,000 ms paste end-to-end deadline from admission, including captured copy wait, acquisition, preparation, and insertion. Cap clipboard acquisition, including its predecessor wait and bounded native/command fallbacks, at 5,000 ms within that overall deadline. Do not restart either deadline per retry, format, worker, or preparation phase. Retain the 250 ms asynchronous stop grace for isolated clipboard executors; unresolved termination is quarantined, with finite retained state and no restart loop. A clean executor exit releases its capacity automatically. Later independent reads are not rejected solely because an older copy/read failed.

Keep potentially blocking native format/text/image reads and platform commands outside the UI event loop in a cancellable process boundary. Reuse existing image preparation logic in an isolated executor; do not fork its codec or validation policy. Retain a worker boundary only where cancellation/exit and bounded source transfer are proven; otherwise execute the same preparer behind a killable child boundary. Capture the operation's deadline and identity in the owning process. A promise timeout must invalidate late insertion and stop/fence resource use, not merely hide a live worker forever. Include cold packaged resolution and process-tree cleanup for platform-command fallbacks.

After acquisition, isolate blocking path/filesystem probes and indivisible expensive classification/codec work. Bound UI-side transfer, normalization, marker replacement, editor layout, and repaint slices using the same 5 ms local target and deterministic byte/work/yield gates as copying. Measure long single-line text and many-line text separately; yielding only before `transformPastedContent` or before one giant editor insertion is not sufficient. Preserve the accepted atomic edit and undo result even if preparation is chunked. If a path probe fails or times out, preserve the existing safe text fallback where applicable rather than fabricate a path chip or block the prompt.

For terminal-provided text, keep valid framing and input bytes in their established order. Process a complete nonempty payload once without native reading, classify/prepare it through the bounded text policy, and preserve input arriving after its closing delimiter. Do not interpret pasted control-like text as agent commands, mouse reports, or additional paste shortcuts. Modal/replacement surfaces retain their own handlers; the ordinary prompt must not claim their Ctrl+V. An externally suspended terminal remains outside A1's control, but a reproducibly freezing supported paste route cannot be certified merely because an application timer is alive.

Alternatives rejected: testing only copy-then-paste; treating the existing image worker/deadline as proof that text classification and insertion are safe; moving only clipboard read off-thread; silently replacing older accepted pastes with the newest one; or clearing a failed-copy latch only after another successful A1 copy.

## Risks / Trade-offs

- **[The exact reported blocking phase is unknown]** -> Preserve evidence versus hypotheses; baseline both event-loop and physical-terminal behavior before selecting remediation details. The copy coordinator is not by itself proof of fixing the freeze.
- **[Helper startup adds clipboard latency]** -> Lazy bounded reuse after successful operations; include startup in the deadline and never delay UI interaction for helper warmup.
- **[Timeout races a real clipboard side effect]** -> Fence the old delivery before any later submission; quarantine uncertain resources, and distinguish submission from verified completion.
- **[Payload limits reject formerly attempted oversized OSC writes]** -> Prefer the destination-correct non-terminal transport for larger copies; explicit size failure is safer than hanging or silently truncating. Test and document exact limits.
- **[Deferred preparation changes selected content or retains old history]** -> Immutable range snapshot, bounded selected references, identity checks, and reflow/streaming/lifecycle tests.
- **[Existing copy/paste paths interact]** -> Capture transaction-specific predecessors and test cycles, stale failure barriers, independent later reads, prompt copy/cut, and `/copy`; no unrelated clipboard feature redesign.
- **[Paste completion overwrites later edits or drops earlier pastes]** -> Keep distinct reservation identities and input order, invalidate canceled/session-old results, and test reverse completion, undo, and interleaved typing.
- **[A fast read is followed by blocking path probing or insertion]** -> Attribute the whole pipeline, isolate blocking preparation, and budget transfer/insertion/presentation rather than timing only native acquisition.
- **[An existing image pipeline regresses during isolation changes]** -> Reuse its validation and chip semantics, preserve image limits and failures, and test packaged cold startup, cancellation, and teardown.
- **[A terminal or OS can hang outside A1's control]** -> Isolate OS clipboard work, validate physical transport behavior, and state platform limitations honestly; never certify a reproducibly freezing route or prescribe recovery keys as the fix.

## Migration Plan

1. Capture a generated baseline and compatibility map on the fresh implementation base, without changing other pending change artifacts.
2. Add exact-range bounded copy preparation, the copy coordinator, isolated delivery and safe terminal fallback; reconcile the captured read/write prerequisite policy with standalone paste admissions.
3. Bound native and terminal-provided paste acquisition, preparation, reservation completion, and teardown while preserving existing chip/image/editing semantics.
4. Validate deterministic copy-only, paste-only, combined fault/text/image/terminal evidence and cold packaged helper resolution; retain payload-free evidence with the candidate.
5. Obtain exact-artifact physical acceptance of both Ctrl+C and independent Ctrl+V without recovery actions. No persisted session or settings migration is required.
6. Roll back the owned clipboard lifecycle/helper integration without altering installed Pi files or stored conversation data. Record that rollback can restore the original freeze risk rather than claiming it as a solution.

## Open Questions

- The reports' terminal name/version, local/remote topology, freeze duration, whether Ctrl+V was terminal-owned or A1-owned, and whether the process or only terminal presentation stops are unknown. Collect these in baseline/acceptance evidence if available; they do not gate this plan or justify assigning a shared root cause.
- The exact copy/read/preparation/presentation phases and terminal capability combinations responsible remain to be measured by task group 1. The chosen boundaries and failure policy apply regardless; work beyond these copy/paste paths requires a separate scope decision rather than silently absorbing general renderer work.
