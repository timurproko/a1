Parallel progress and solo-like interaction behavior are equal highest-priority functional requirements. Responsive input, flicker prevention, coherent presentation, and live animations are not a later polish phase. This ledger is in dependency order; PR outcome numbering is not execution order. Read `implementation-guide.md` for concrete owners, invariants, fixture design, and decision gates. Markers below report current implementation progress.

## 1. Baseline, real-Agent reproduction, and observation (supports all outcomes)

- [x] 1.1 Reconcile current `origin/develop` and any integrated #794/#795 changes in this branch; record actual source/native/child/cohort identities, map changed owners, and keep fixtures isolated from user profiles, credentials, resident processes, clipboard, and sessions.
- [x] 1.2 Add a bounded loopback provider/tool scenario through the real configured engine and owned-shell renderer, not a mocked session or counter child; run three unfinished turns with all six first-response permutations crossed with three initial views and a fixture-controlled completion barrier.
- [x] 1.3 Add opt-in bounded content-free observations for engine delivery, actual child render/write, PTY ingestion, committed holder state, attach receipt, and completed outer paint, with tab/incarnation and causal sequence identity; establish compatible clocks and report observation loss instead of silently discarding samples.
- [x] 1.4 Add negative controls isolating one stopped engine, renderer, holder commit, or outer painter; demonstrate stage-specific failure even when other tabs and final output succeed. Do not force `renderNow` in the liveness fixture.
- [x] 1.5 Characterize actual built PTY/ConPTY transaction controls and mode changes with fragmented real-A1 writes; classify the live/reproduced stall without asserting that source findings alone prove its cause. Record explicit blockers if the reproduction or native coherence mechanism is unavailable.

## 2. Native snapshot, identity, and compatibility contracts (outcomes 2–5; prerequisite to representation edits)

- [x] 2.1 Define complete immutable row/cell snapshots with styles, links, grapheme widths, cursor/modes, tab/incarnation/revision, dimensions and geometry generation; keep controller generation, server epoch, and client request identity distinct. Prefer full wire snapshots with shared unchanged rows over wire patches.
- [x] 2.2 Establish the pinned public Ghostty API path for transaction boundaries and hyperlink target/ID extraction, including end→begin within one read and resize clearing sync mode; resolve any missing capability with the maintainer before vendor changes or alternate visual authority.
- [x] 2.3 Specify and enforce encoded/decoded bounds, checked dimensions and allocation arithmetic, attribute/link limits, and oversized-state behavior within existing frame/input ceilings; keep a complete prior view on a typed failure rather than truncating or enlarging limits silently.
- [x] 2.4 Add additive capability negotiation on both holder/server and server/attach links, complete legacy fallback, and mixed-cohort/reconnect fixtures; regenerate canonical protocol bytes and cover Rust/TypeScript decoders and malformed inputs without changing generation-1 compatibility.
- [x] 2.5 Define a bounded ordered effect lane with incarnation/sequence and foreground attribution independent of body subscription or visual revision; specify duplicate/stale rejection and no historical clipboard replay.

## 3. Coherent holder commits and hidden progress (outcomes 1–3)

- [x] 3.1 Implement mutable-parser versus immutable-committed state; keep the previous commit during open synchronized updates and publish at valid completion, including mode-only/end-only writes, multiple transactions per read, and end→begin in one read.
- [x] 3.2 Implement local deadline-based malformed-transaction recovery without restarting the child or renewing the deadline on bytes/repeated begin/subscription; cover late end, parser reset, resize, exit, and subsequent valid output while queries and other tabs keep progressing.
- [x] 3.3 Capture and retain dirty rows before clearing damage, reuse unchanged complete rows, and advance commits while hidden without full-screen wire serialization; mode/cursor/palette changes must remain observable even without text damage.
- [x] 3.4 Route subscription, reconnect, resize, normal streaming, and crash/recovery surface production through the same committed-state contract; fixtures reject mutable mid-transaction snapshots and false child progress from re-offered revisions.
- [x] 3.5 Keep PTY draining, query replies, animation state, and local commits running during bounded asynchronous server reconnect/backoff; fence obsolete connection completions and bound reader/writer teardown and retained pending state.

## 4. Fair routing, subscriptions, and independent execution (outcomes 1, 3, 4)

- [x] 4.1 Replace unbounded holder-output and attach server/input ingress with explicitly byte-accounted lanes; retain lossless ordered raw PTY bytes and admitted semantic input, whole-paste admission, one latest complete visual state, and separate reliable control/effects.
- [x] 4.2 Bound work rounds by event/byte/time quanta with level-safe wakes and earliest-deadline timers; sustained input and output must both yield to control, other work, and animations without waiting for a queue to empty or adding isolated-event pacing delay.
- [x] 4.3 Snapshot small routing/authority records under the server mutex, then encode/share large immutable surfaces outside it; reject stale route/incarnation completions and cover switch/close/restart or delayed lifecycle work during serialization.
- [x] 4.4 Track per-tab subscriber sets across attach, view change, disconnect, and reconnect; keep metadata/heartbeats independent, unsubscribe only after the last viewer leaves, request a fresh complete commit on selection, and bound stale fallback from the request start rather than each re-offer.
- [x] 4.5 Isolate blocked socket/stdout writers from input and shared routing; bound queued plus in-flight bytes, acknowledge completed paints before advancing the diff baseline, and cover slow viewer, slow physical sink, partial write, disconnect, and teardown without worker leaks.
- [x] 4.6 Repair only the demonstrated engine/admission/render coupling from task 1 with a focused regression; retain existing visibility-independent child scheduling and process/session ownership, including hidden/detached successive pre-settlement content and animation checkpoints.

## 5. Incremental composition, activation, and geometry (outcomes 2–4)

- [x] 5.1 Make final attach composition the only outer synchronization owner, including cursor shape/blink and visibility; protocol assertions reject nested ends, cursor-style writes outside the envelope, mode-only update loss, and link/style leakage into host chrome.
- [x] 5.2 Diff the desired child/strip/overlay composite against the actually painted baseline; equal states produce no body writes, one-row edits do not repaint unchanged transcript, strip-only changes stay strip-only, and overlay dismissal restores the newest underlying content.
- [x] 5.3 Restrict full paints to initialization, invalid geometry/base, and explicit resync; cover styled trailing blanks, erasure, wide-cell tails, bottom-right wrap, selection, overlay overlap, and skipped visual states. If wire patches become necessary, require explicit matching bases and full resync on gaps before enabling them.
- [x] 5.4 Carry geometry generation through resize and commit only compatible tab/incarnation/request/revision/geometry; distinguish parser resize/provisional fitting from child repaint, publish idle-child resize without a model token, and preserve controller-owned geometry for differently sized spectators.
- [x] 5.5 Preserve coherent prior content during A→B→A switches and shrink→grow races; fence old holder frames and superseded responses, commit target topology/body/overlays/modes/cursor together, and keep the final selected tab updating while its turn remains unfinished.
- [x] 5.6 Preserve exactly-once ordered first input through the existing controller boundary; cover cancelled/failed targets, pending key/paste/focus/mouse events, Settings activation, and two-terminal transfer without retargeting input to whichever old body remains visible.
- [x] 5.7 Keep normal child and strip animations live under simultaneous streaming, overlays, and output pressure; assert advancing phases and per-tab maximum gaps rather than only a working glyph.

## 6. Semantic terminal fidelity and effect safety (outcome 5)

- [x] 6.1 Carry and emit hyperlink targets/IDs, default/indexed/RGB colors, underline type/color, strike, overline, conceal, blink, intensity, and Unicode widths; semantic round trips cover palette/default-color-only changes, styled blanks, and combining/wide/emoji transitions.
- [x] 6.2 Preserve child-model versus attach-owned outer-mode responsibilities and detach/failure restoration; implement independent effect sequencing/foreground eligibility with two effects in one visual revision, hidden emissions, delayed old-incarnation effects, frame replacement, and reattach without replay.
- [x] 6.3 Correct `main.rs::probe_input` and fidelity report claims to inspect link targets, attributes, cursor/mode semantics and synthetic clipboard output, not token presence; retain bell suppression and explicit unsupported-image text fallback.

## 7. Real-A1 temporal comparison and validation owners (outcome 6)

- [x] 7.1 Add direct-solo/resident scripts at matching child geometry/capabilities with normal rendering; compare intermediate cells/cursor/styles/modes and inspect every outer transaction for clear/partial-frame artifacts, not just final text or raw ANSI equality.
- [x] 7.2 Add named bounded concurrent variants for first-response/view permutations, hidden and detached intervals, slow socket and outer sink, lifecycle/reconnect pressure, repeated switching, input, overlays, and resize; require per-tab partial-content and animation progress before any turn is released to settle.
- [x] 7.3 Add per-tab matched latency samples, provider/engine-to-render and renderer-to-holder delay, completed-paint timing, animation/worst-gap and write-volume assertions; retain the four p95 budgets, minimum sample counts and independent no-progress deadline from the guide, and reject clock/missing/duplicate/stale-observation faults.
- [x] 7.4 Fault-test the integrated harness with frozen/late individual tabs, redundant full repaint, premature transaction publication, lost geometry identity and duplicated effects; incomplete instrumentation, skipped cases, or successful final content must not yield a passing verdict.
- [x] 7.5 Wire exact-built real A1 plus native roles into existing validation owners/callers and report uploads; ensure path selection and build prerequisites include new fixtures, preserve existing component tests, and report Windows x64/Linux x64/macOS arm64 separately without inheriting physical or macOS x64 verdicts.

## 8. Pre-ready delivery bookkeeping (finish before the last PR marker)

- [x] 8.1 Update architecture/evidence documentation with actual representation, lane bounds, compatibility, reproduction boundary and limitations; dispose of substantive gaps without calling unrun checks successes or weakening the approved behavior.
- [x] 8.2 Complete the outcome map below, reconcile and push current `origin/develop`, run quick typecheck/touched checks and strict OpenSpec validation, add plain Acceptance, and pass `check-delivery-body.mjs --final` before checking the final Implementation item. Do not mark ready manually or require future CI/manual results in committed tasks.

## Outcome completion map

Keep the six existing PR item texts unchanged. Toggle each marker as soon as its mapped code/tests and detailed bookkeeping are complete, even if other outcomes remain open. Shared prerequisites need not be repeated or re-run. CI/manual results are not checkbox prerequisites.

| Existing PR outcome | Required task groups |
| --- | --- |
| 1. Independent generation/rendering/animation | 1; 3; 4; 5.5–5.7, including real pre-settlement progress regressions |
| 2. Coherent transactions and one envelope | 2.1–2.4; 3.1–3.4; 5.1, including transaction/recovery fixtures |
| 3. Complete retained state and changed-content painting | 2.1–2.4; 3.3–3.4; 4.3–4.5; 5.2–5.3 |
| 4. Responsive input/activation/resize/fairness | 4; 5.4–5.7, including blocked-output and controller regressions |
| 5. Styles/links/cursor/effects | 2.2; 2.5; 5.1; 6 |
| 6. Real-A1 temporal/concurrent harnesses | 1; 7 |

Whichever outcome finishes last also waits for group 8. Exact-head CI then runs under trusted readiness/finalization; report its verdict separately at handoff.
