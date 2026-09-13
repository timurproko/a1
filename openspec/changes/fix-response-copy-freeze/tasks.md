## 1. Establish the copy-specific baseline

- [ ] 1.1 Reconcile the fresh implementation base with accepted selection/input behavior and `keep-streaming-ui-responsive-during-selection`; verify a compatibility map identifies shared boundaries, unchanged prompt/comparison paths, and the actual response-copy route without modifying unrelated artifacts.
- [ ] 1.2 Add bounded payload-free phase diagnostics for copy capture, extraction, selection-clear presentation, encoding, delivery, deadlines, and teardown; verify records identify request/transport/result, timing and pending-byte counts without selected text or base64.
- [ ] 1.3 Capture generated cold/warm small-response copies while idle/streaming in short/long sessions and large-selection controls; verify evidence separates event-loop delay, repaint cost, and terminal submission from an unresolved asynchronous promise, and records unconfirmed physical-terminal causes honestly.

## 2. Bound selected-text preparation and preserve input semantics

- [ ] 2.1 Capture an immutable selected-range intent at the Ctrl+C input boundary without slicing unrelated transcript rows; verify forward/reverse, Unicode, ANSI, newline, chrome/transient-tail exclusion, and concurrent reflow/streaming tests produce the original exact text.
- [ ] 2.2 Add bounded selected-source retention and incremental extraction/encoding with cancellation, UTF-8 byte accounting, and the 16 MiB limit; verify deterministic yields during large and long-single-line work, equivalent small-copy work across history sizes, bounded scratch memory, and explicit non-truncating size rejection.
- [ ] 2.3 Keep copy-key consumption and selection-clear presentation independent of delivery; verify following typing/wheel/agent events and animation progress before a stalled copy settles, no unchanged-content reformatting is introduced, and asynchronous callbacks never clear a newer selection.

## 3. Implement bounded delivery and ordering

- [ ] 3.1 Introduce the owned copy coordinator with explicit outcomes, one delivering request and one newest pending request, and a 5,000 ms admission deadline; verify controlled-scheduler tests cover pending supersession, exact deadline settlement, byte/resource bounds, and no obsolete delivery after a newer copy.
- [ ] 3.2 Implement bounded retry, cancellation, 250 ms cleanup grace, and side-effect fencing/quarantine; verify stuck startup/delivery cannot strand UI work, unsafe resources are not reused, late results cannot overwrite newer state, and safe recovery works without restart.
- [ ] 3.3 Connect response-copy completion to the existing A1-owned paste ordering seam and coalesced non-modal failure feedback; verify immediate copy-then-paste never waits indefinitely or silently pastes an old value after known failure, while prompt copy/cut/paste, terminal-provided paste, and `/copy` controls retain their semantics.

## 4. Isolate platform delivery and preserve terminal compatibility

- [ ] 4.1 Add destination-aware transport selection and a cancellable child-process clipboard boundary for supported local hosts; verify local/remote routing, native unavailability, busy/denied clipboard, helper crash/hang, bounded IPC, hidden startup, and absence of clipboard payloads in argv, temporary files, logs, or inherited terminal output.
- [ ] 4.2 Retain a bounded destination-correct OSC 52 fallback through the existing single writer, with a 64 KiB complete-sequence ceiling or lower known capability limit; verify exact base64/framing, encoded-limit boundaries, unsupported-route feedback, no duplicate concurrent native/terminal writes, and submitted-unverified outcomes rather than false success.
- [ ] 4.3 Attribute and eliminate copy-specific terminal submission blocking on supported routes; verify backpressure/fault tests permit later UI work, replay shows atomic controls outside rendering transactions, and physical-terminal evidence is required before classifying a suspect route as safe.
- [ ] 4.4 Package the isolated helper and bind all resources to session lifecycle; verify cold built/packaged resolution, startup within the request deadline, no late clipboard/terminal writes across session replacement, bounded exit without orphan growth, and complete terminal restoration.

## 5. Validate the integrated response-copy contract

- [ ] 5.1 Run deterministic fault and text matrices spanning cold/warm small copies, repeated distinct requests, long selections/sessions, idle/streaming, terminal delay, busy/missing/denied/non-settling clipboard, recovery, and teardown; verify gates fail blocked input/timers, unbounded work, stale deliveries, incorrect payloads, and privacy leaks.
- [ ] 5.2 Exercise mixed copy, typing, wheel, paste, new selection, overlay/replacement ownership, and Ctrl+C without selection; verify receipt order, agent cancellation ownership, follow/detach preservation, unchanged prompt/comparison behavior, and installed package identity.
- [ ] 5.3 Obtain required CI results for the exact implementation candidate and retain bounded evidence; verify all required checks and helper/package/terminal conformance pass without treating timing distributions alone as automated proof of responsiveness.

## 6. Validate physically and record acceptance

- [ ] 6.1 Hand off the exact built candidate with the color-preserving development entry and a selected-response Ctrl+C workload; verify the handoff identifies worktree/commit, terminal/version, topology, geometry, chosen transport, known limits, and independent clipboard-value checks without proposing Esc as recovery.
- [ ] 6.2 Record physical cold/warm idle/streaming copying, starting with at least 100 small distinct cycles and large/multiline cases; verify typing/scrolling/visible output remain responsive without recovery actions, record p50/p95/max input-to-paint and status gaps against the design targets, and retain any contradictory freeze as failed acceptance.
- [ ] 6.3 Obtain explicit user acceptance of freeze-free ordinary copying on the exact candidate; verify acceptance is recorded only after clipboard contents and sustained UI responsiveness pass, then seek explicit implementation merge authorization before completing the accepted-change archival follow-up.
