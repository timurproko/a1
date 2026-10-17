## 1. Independent real-Agent progress (Implementation item 1; highest priority)

- [ ] 1.1 Add a bounded deterministic provider/tool fixture driving three real owned A1 children with overlapping unfinished turns; cover every first-responder and initial-view order and identify pre-fix engine/render/presentation progress separately.
- [ ] 1.2 Add content-free per-tab causal counters/timestamps at engine event, child render, PTY ingestion, retained commit, and outer paint; demonstrate that the fixture distinguishes a stalled engine, a stalled child renderer, and a stale viewer without logging user content.
- [ ] 1.3 Repair demonstrated visibility, admission, event-delivery, or shared-resource coupling so all children generate content and advance animation state while hidden or detached; add focused regressions showing successive pre-settlement checkpoints in each Agent.
- [ ] 1.4 Keep retained state current without mandatory hidden full-screen serialization, with a fresh complete snapshot and continued live updates on subscription; cover hidden animation phase and a switch while every turn is unfinished.
- [ ] 1.5 Preserve per-tab revision/incarnation independence and separate slow-client pressure from child progress; cover a high-revision first Agent, lower-revision later Agents, and two clients viewing different tabs.

## 2. Atomic native frame publication (Implementation item 2)

- [ ] 2.1 Characterize real A1 synchronized output through the built PTY/ConPTY on each exercised platform and add split-sequence, chunk-boundary, mode-only, and clear-before-paint fixtures; record what the transport actually preserves.
- [ ] 2.2 Separate mutable parsed state from coherent committed state, withholding normal publication during open transactions and publishing promptly at completion; assertions reject incomplete subscription/reconnect snapshots.
- [ ] 2.3 Add bounded local recovery for malformed or unfinished transactions without blocking unrelated tabs or extending the bound with every byte; cover timeout and subsequent valid output.
- [ ] 2.4 Give the final compositor sole synchronization ownership over child damage, overlays, modes, and cursor; byte/protocol assertions reject nested end markers and early cursor exposure.

## 3. Retained state and incremental outer damage (Implementation item 3)

- [ ] 3.1 Introduce bounded native row/attribute snapshots with tab, incarnation, revision, and geometry identity, reusing unchanged retained rows; cover full-snapshot completeness without attach parsing arbitrary ANSI patches.
- [ ] 3.2 Add negotiated presentation transport and complete legacy fallback; mixed-feature and skipped-base fixtures require explicit resynchronization rather than corrupt patch reuse.
- [ ] 3.3 Compare current retained state with actually painted state and emit only changed rows/runs during ordinary input/streaming; tests bound write volume and prohibit redundant body paints for equivalent surfaces or strip-only animations.
- [ ] 3.4 Preserve overlay restoration and full resync after attach/reconnect/geometry invalidation; cover selection, popup dismissal, and recovery without blank repair frames.

## 4. Responsive scheduling, activation, and geometry (Implementation item 4)

- [ ] 4.1 Bound ingress buffers and scheduling rounds while keeping reliable control/input separate from replaceable visual state; flood fixtures demonstrate fair service without dropped admitted input or unbounded accumulation.
- [ ] 4.2 Remove expensive render serialization and blocking operations from shared server critical sections; concurrent output plus lifecycle-delay fixtures show unrelated Agents and input continue.
- [ ] 4.3 Commit only matching tab/incarnation/revision/geometry and preserve safely fitted prior content during resize; cover rapid shrink/grow, interleaved old frames, and superseding view requests.
- [ ] 4.4 Preserve exactly-once first input through bounded controller acknowledgement while switching among streaming Agents; cover typing, paste, focus, mouse, two-terminal transfer, and Settings activation.
- [ ] 4.5 Keep child and strip animations live under simultaneous streaming and overlays; assert advancing phase and bounded visible gaps, not merely a static working glyph.

## 5. Text-terminal fidelity (Implementation item 5)

- [ ] 5.1 Preserve hyperlink targets/IDs and supported style attributes including underline type/color, strike, overline, conceal, blink, intensity, and Unicode width through retained snapshots and damage output; round-trip assertions inspect semantics rather than visible labels alone.
- [ ] 5.2 Preserve cursor/mode ordering and once-only foreground effects under frame replacement while suppressing hidden clipboard effects; cover switching, overlay transitions, and detach restoration with synthetic payloads only.
- [ ] 5.3 Correct the existing fidelity probe's overbroad hyperlink/style claims and retain explicit unsupported-image fallback; failures identify the missing attribute or boundary.

## 6. Real-A1 temporal parity and delivery (Implementation item 6)

- [ ] 6.1 Add equivalent direct-solo and resident real-owned-shell scripts at matching child dimensions, checking intermediate text, cursor, modes, styles, effects, and damage over typing, streaming, overlays, and resize.
- [ ] 6.2 Extend exact-artifact workloads to simultaneous three-Agent turns, rotating first responder, hidden/detached animation progress, repeated activation, and slow-client/lifecycle pressure; missing progress in any Agent fails independently of final success.
- [ ] 6.3 Add separate per-tab input, engine-to-render, output-to-present, activation, animation-gap, and write-volume observations; retain existing p95 budgets and report worst stalls without pooling away a frozen Agent.
- [ ] 6.4 Wire bounded workloads into the existing platform validation owners and document exact platform/build verdicts without claiming unrun physical or macOS x64 behavior.
- [ ] 6.5 Reconcile integrated #794/#795 changes and current origin/develop, run quick touched checks plus strict OpenSpec validation, and dispose of substantive known gaps before the final Implementation marker; update truthful task/outcome bookkeeping and plain Acceptance without promoting the PR manually.
