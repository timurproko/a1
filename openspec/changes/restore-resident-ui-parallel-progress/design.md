## Context

See `proposal.md` for the user report and scope. The inspected baseline is `19f347926938f89320a1b107db292491a3299b2d`, including #792 and #798. This is a corrective continuation of their behavior contracts, not a claim that those contracts were satisfied by their presence in the specs.

### Observed implementation facts

- Direct solo bypasses resident discovery and writes through the owned terminal runtime. Resident A1 adds PTY/ConPTY, holder-owned Ghostty parsing, a server hop, and attach-owned ANSI composition.
- `roles/holder.rs::surface_message` forces full damage before every complete ANSI snapshot. `serve_holder` subscribes every holder, including hidden ones, so complete surfaces are continuously serialized and delivered to shared server state. `serve_holder` clones/encodes outgoing surfaces while holding the server mutex. This creates plausible contention and unnecessary work; it is not proof of the reported execution freeze.
- The holder publishes after draining whichever PTY chunks are queued, without withholding publication while the retained terminal is in synchronized-output mode. Recording that mode in a surface does not enforce it.
- `ghostty.rs::compose_frame` and `roles/presentation.rs::Frame::compose` both emit synchronization wrappers. DEC synchronized output is a mode, not nested transactions; the inner end can expose the overlay/cursor tail early.
- Attach receives through an unbounded message channel and drains all available messages, repainting surfaces, before handling the next outer input. Output and control are not a bounded fair scheduling round.
- Resize repaints the previously cached body before the child acknowledges the new geometry. The opaque surface lacks a robust presentation geometry contract.
- Cell serialization omits OSC 8 targets and several style attributes. The existing fidelity probe checks the visible word `linked`, not preservation of its target.
- Owned composition currently ignores visibility for render suspension; hidden child rendering is intended to remain live. The existing three-tab integration fixture is a small counter written every 20 ms, allows 15 seconds to find a selected label, and does not exercise real A1 provider events, full transcript reflow, or child animation progress.
- `a1 tabs host status` in this session's command context returned `No resident tabs are running.` It does not identify the build/profile of the maintainer's reported stall. No user processes were launched, interrupted, or stopped.

### Prototype reference

Read-only inspection of `E:/Backups/pi/v2` found committed-frame publication in `agent/multiagent/child-bridge.ts` and `daemon-logic.ts`, preferential direct-frame delivery over delayed PTY output, differentiated echo/stream scheduling, and one outer atomic frame with redundant row writes pruned in `core/host/pi/providers/host-bridge-tui.ts`. Its PTY fallback also held transiently erased rows. These are explanations for potentially better visual behavior, not comparative benchmark results or authority to restore its shared daemon, private renderer interception, dual frame sources, or content heuristics.

## Goals / Non-Goals

**Goals:**

- Treat independent parallel progress and solo-like interaction behavior as equally critical functional outcomes. Correct the first-responder-only failure without deferring responsive input, flicker prevention, coherent frames, or live animation as visual polish; neither outcome alone completes this repair.
- Preserve one terminal-state authority per tab and process isolation while making the final viewed experience equivalent to solo within the declared text-terminal scope.
- Distinguish provider/engine progress, child UI progress, retained terminal progress, and client presentation; no layer may pass by borrowing another layer's progress.
- Prefer complete coherent states and small final damage over exhaustive delivery of every intermediate render.

**Non-Goals:**

- No shared agent event loop, serial agent run queue, renderer redesign for solo, or intentional suspension of hidden children.
- No restoration of v2's rendered-frame metadata bridge or automatic switching between independent screen authorities.
- No arbitrary terminal application support, image protocol forwarding, split panes, tab quota, or new user tuning knobs.
- No unrequested changes to model/provider concurrency policy, credentials, process containment, session persistence, native packaging, or the two other active implementation streams.

## Decisions

### 1. Diagnose parallel progress and interaction behavior together

Use the same workload to expose execution stalls, input latency, flicker, stale frames, and frozen animations from the start. The numbered decisions and task groups express dependencies, not a priority ranking or a later cosmetic phase.

Build an isolated scenario with three real owned A1 children and a deterministic streaming provider that keeps all turns in progress simultaneously. Rotate which tab receives the first token and which tab is initially viewed. Keep generating independent sequence-stamped content while switching, typing, scrolling, and opening overlays. Repeat with no viewer and with a deliberately slow viewer.

Observe bounded identities, counters, and monotonic timestamps at submission/provider event, child render completion, PTY ingestion, holder commit, attach receipt, and outer paint. Keep presentation content synthetic and exclude prompts, transcript bytes, credentials, and arbitrary exceptions from diagnostic output. Run each child renderer normally, not a key-echo stand-in. If engine events stop, trace admission/event delivery rather than masking it with a spinner. If events continue but rendered state stops, fix that exact boundary.

Each child remains independently scheduled when hidden. Hidden animation frames may be coalesced before external delivery, but animation phase and child terminal state continue advancing. Selection must reveal current partial text and current animation phase, then keep moving; showing one fresh snapshot followed by a freeze is a failure.

**Alternative rejected:** relying on process liveness, final answers, or strip spinners as proof of concurrent agent progress. Those can all be healthy while content is stuck.

### 2. Keep native terminal state authoritative and publish coherent commits

Use the retained parser's synchronized-output mode rather than searching arbitrary read chunks for marker strings. PTY read boundaries never define a frame. Keep the previous committed snapshot while a valid transaction is open, publish promptly when it ends, and continue parsing/answering terminal queries throughout. Bound malformed or unfinished transactions with an explicit deadline that cannot be extended indefinitely by new bytes; recovery is local to that tab and counted as a recovery, not evidence of a normally completed child frame. Boundary-only mode changes must also wake publication.

Separate the latest mutable parsed state from the latest committed visual state so subscription, resize, and reconnect cannot expose a mid-transaction screen. Non-synchronized applications require bounded fair coalescing, not an A1-specific content detector or an arbitrary delay on every keystroke. On Windows, first characterize what actual ConPTY preserves with complete and deliberately fragmented real A1 frames. If the approved native-only design cannot satisfy coherence, stop and request architectural refinement rather than silently adding a second visual bridge.

Only attach's final compositor emits synchronized-update controls. Child rows are data, not independently wrapped outer frames. Include child damage, strip/overlay damage, cursor/modes, and final visibility in one transaction. Do not rely on a single OS write to create nested terminal transactions.

**Alternatives rejected:** sending every chunk immediately; adding a global repaint delay; treating two DEC mode pairs as nested; silently reinstating v2's dual authority.

### 3. Separate complete retained state from incremental painting

Introduce a bounded native presentation representation with complete row content/attributes, cursor/modes, tab/incarnation, revision, and geometry identity. It must be usable without attach interpreting arbitrary ANSI patches. Retain complete snapshots for attach, reconnect, view changes, and resynchronization. Track dirty rows in the holder and reuse unchanged row state rather than walking/re-encoding every cell after every output chunk.

The final compositor compares the newest complete state against the state actually painted. It writes changed rows/runs and restores overlay damage; equivalent surfaces emit no body paint. Strip-only changes do not repaint a known unchanged body. A full render is reserved for initial presentation, invalidated geometry/base, and explicit resynchronization. Two full snapshots may be coalesced safely; a patch cannot replace a full state or apply to a missing base. If wire patches are introduced, use explicit base revisions and demand a complete resync on a gap.

Hidden holders continuously parse and maintain current state without mandatory full-screen serialization to the shared server on every animation tick. View subscriptions obtain a fresh complete committed snapshot. Any cached server snapshot is explicitly stale until refreshed; preserve coherent prior content during that bounded handoff. Metadata status delivery remains independent of visual delivery.

**Alternative rejected:** removing `mark_dirty` while retaining the existing complete-body contract. That restores the old bug where a dirty-row patch is cached as a complete screen. Full snapshots are not inherently wrong; indiscriminate repainting and repeated serialization are.

### 4. Make work bounded and fair across tabs and inputs

Bound ingress by bytes as well as messages. Keep reliable ordered control separate from replaceable visual state, and enforce bounded work quanta for input, control, output ingestion, surface publication, and animation deadlines. An always-nonempty render queue must yield to input and other tabs; an input flood must likewise yield to output/control. Use wake-driven scheduling for isolated events rather than fixed pacing polls.

Take small metadata/routing snapshots under the server mutex and serialize/clone large render payloads outside it. Do not perform blocking I/O, process observation, or durable operations while holding shared presentation authority. Backpressure remains local to one connection or holder and cannot create an unbounded buffer or park unrelated agents. Preserve all admitted semantic input in order; only obsolete visual states may be coalesced.

Audit controller handoff, view subscriptions, and prompt admission with the real-A1 scenario: input readiness is not equivalent to a current screenshot. Do not restart a healthy agent to make a stale screen appear current.

**Alternative rejected:** raising queue limits, resetting all tabs, or stopping background rendering to make the selected one look fast.

### 5. Bind view and resize commits to tab identity and geometry

Treat tab/incarnation/revision/geometry as the presentation identity. Never compare unrelated tabs' revisions globally. A resize invalidates old output geometry; retain or safely clip the prior coherent state while requesting the replacement, never blindly replay old-width cursor-addressed ANSI after a clear. Commit the correct surface, strip, overlay geometry, modes, and cursor together. Rapid superseding switches discard obsolete view requests without withholding the final requested tab's live continuation.

Keep ordered first input pending only through the existing bounded controller acknowledgement; selecting a tab must not resume or restart its engine. Preserve input exactly once, not drop it to make handoff appear instantaneous.

**Alternative rejected:** repainting stale geometry and hoping the next token repairs it, or accepting a final snapshot as proof that activation stayed live.

### 6. Preserve the certified text-terminal contract

Carry OSC 8 targets and IDs, foreground/background/intensity, underline style and color, italic, inverse, conceal, strikethrough, overline, supported blink, Unicode width/graphemes, and cursor shape/visibility through the native presentation model. Distinguish retained attributes from one-shot side effects such as clipboard writes; dropping or replacing a visual frame must not duplicate an effect. Preserve hidden-effect suppression and existing text fallback for images.

Correct fidelity assertions to inspect target/attribute semantics, not just label text. Any library API limitation becomes an explicit blocker or separately approved refinement, not a silently passing parity field.

### 7. Prove temporal parity, not only final-screen equality

Keep small unit/model fixtures, but add real owned-shell end-to-end workloads through built native roles and direct solo at equivalent child dimensions. Use deterministic local provider/tool events so network latency and model variability cannot masquerade as scheduler regressions. Observe several partial checkpoints before turn settlement, delayed and interleaved chunks, spinner phase changes, simultaneous child animations, first input after each switch, resize, and slow-client pressure.

Retain the existing p95 budgets as acceptance targets for the controlled workload: input-to-process 16 ms, committed output-to-present 33 ms, retained activation paint 300 ms and first accepted input 400 ms. Report provider-to-child-render separately; do not start a presentation timer so late that a stalled renderer appears fast. Report per-tab gaps and worst stalls as well as pooled percentiles so one fast Agent cannot hide two frozen ones. Keep hard missing-progress assertions independent from latency percentile reporting.

The test matrix runs on Windows x64, Linux x64, and macOS arm64 using their exact built artifacts; macOS x64 remains separately reported and cannot inherit an arm64 behavioral verdict. Timing, content-free progress, intermediate cell/cursor correctness, write volume, and style/effect preservation are distinct assertions. Physical-terminal review remains optional maintainer acceptance and is never substituted by a headless claim or made a task-checkbox gate.

## Risks / Trade-offs

- [The current stall may originate above the native renderer] -> Observe every boundary first and repair the demonstrated dependency inside the approved parallel-progress scope. External provider refusal is reported distinctly from an A1 scheduler stall.
- [Windows ConPTY may transform or remove frame controls] -> Characterize actual transport before relying on mode preservation; do not promise a synchronization flag alone fixes Windows flicker.
- [Suppressing hidden transport can regress switch freshness] -> Keep parsing and child rendering live, use fresh-on-view commits, and assert live continuation before any turn finishes.
- [Damage transport and coalescing can disagree about bases] -> Compare complete retained states at the painter and resync explicitly on invalidated bases; never replay an arbitrary ANSI patch as a complete screen.
- [New representation changes mixed-version compatibility] -> Feature-negotiate additive surface capability; preserve a complete legacy fallback without certifying it as repaired parity. Require an explicit user-managed cohort restart when needed, never kill existing tabs automatically.
- [Other implementation branches alter native hosting and source layout] -> Reconcile current develop in this branch and apply changes to the integrated owners without modifying #794/#795 worktrees or duplicating their refactors.
- [Heavy real-renderer fixtures cost more than counter fixtures] -> Keep synthetic streams, finite durations, exact cases, and bounded per-platform lanes; do not weaken assertions to fit a fast smoke claim.

## Migration Plan

1. Planning-only draft records the approved equal priority of parallel progress and solo-like interaction behavior; await explicit implementation request.
2. Establish real-A1 three-agent reproduction and causal observations for both execution and interaction behavior before repairs. No live user session or clipboard is driven by automation.
3. Repair parallel progress/fairness, frame publication, damage-aware composition, and identity/geometry in dependency order; retain focused regressions for each defect.
4. Add complete attribute fidelity and exact-artifact temporal comparison, reconciling other integrated branches as needed.
5. Preserve stored sessions/settings/registry authority; negotiate presentation compatibility without automatic resident replacement. Keep solo available unchanged.
6. Complete outcome bookkeeping and known-gap disposition before readiness. No broad local regression suite is added to the required pre-push workflow.

## Current evidence and gaps

This plan contains source findings, not a runtime root-cause verdict or performance result. The maintainer's exact package, resident cohort, terminal version, and live freeze trace are not recorded. Implementation must add a deterministic failing scenario or narrow the diagnosis with explicit evidence; neither a green counter test nor a newer source checkout alone disposes of the reported first-agent-only failure. No defect is claimed fixed and no implementation task is complete.
