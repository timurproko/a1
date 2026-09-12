## Context

See `proposal.md` for motivation. The planning base is `bf3bd014`; the relevant rendering paths match the read-only investigation at `65ed2395`, using Pi/Pi TUI 0.84.2.

- `session-shell.ts` applies a block through `session-shell-root.ts` before requesting the 33 ms stream presentation coalescer. Component preparation therefore precedes, rather than benefits from, that throttle.
- `shell-presenters-transcript.ts` calls `updateArgs`, execution/argument state setters, result update, and `setExpanded` on a tool component. Each pinned setter calls `updateDisplay`. Completed `write` calls rebuild whole-content highlighting in `renderCall`, before taking the ten-line preview. General root updates also invalidate all transcript components.
- `session-viewport-controller.ts` requests repaint for every motion, including duplicate endpoints. Its wheel branch additionally sets `forceRepaint = true`, causing `requestRender(true)` to reset the pinned differential reference; suppressing an eventual erase-display does not eliminate the broad row rewrite. SGR reports are conservative input barriers; keyboard burst coordination is not a mouse-motion optimizer.
- The root's dock-only reuse is keyboard-driven. Selection and status frames still assemble document/tail arrays and traverse visible composition, even when underlying content is unchanged. Selection-row caches already exist and should be retained, not replaced with a second selection model.
- Every input receipt calls `noteImmediatePresentation`, canceling a pending stream timer even when the report causes no paint. Actual composition/write completion is not the authority for that acknowledgment.
- `TranscriptViewport` rejects safe vertical shifts whenever a selection exists, including after release. The damage adapter independently vetoes selection. This is conservative correctness, but it causes broader positional painting when followed content moves.

Read-only synthetic probes used 258 and 2,000 TypeScript lines, kept collapsed at 120 columns. A final tool update invoked the call renderer four times and took approximately 46/260 ms respectively; repeated invalidation of the unchanged completed component averaged 9/64 ms. A 500-report identical drag produced 500 render requests and zero selection-revision changes. A one-row followed append was shift-eligible without a selection and ineligible with a released selection. These are diagnostic mechanisms, not benchmark gates or proof of physical-terminal latency; render requests are not actual frames.

The existing `eliminate-code-block-streaming-flicker` change owns candidate-versus-explicit hyperlink safety and bounded hover cleanup. Its accepted behavior is a compatibility dependency, not a reason to reopen that design. Reconcile its integrated state before changing the shared adapter. The current selection, input, and transient-tail contracts remain authoritative; this change does not synchronize unrelated outstanding deltas.

## Goals / Non-Goals

**Goals:**
- Bound selection and wheel-scrolling work by visible damage, without repeating content-sized preparation or forcing full-frame repaint on each wheel report.
- Separate current semantic state, prepared content revisions, applied interaction revisions, and presented revisions.
- Keep input, visible animation, ongoing content, and completion progressing under sustained mixed load.
- Preserve exact pinned built-in preview output and selection/copy behavior through public owned boundaries.

**Non-Goals:**
- Guarantee zero OS/terminal latency, move the agent engine to another thread, or freeze output while selecting.
- Change the spinner interval, lower the global frame rate as the fix, silently detach on selection, or clear selection to permit scrolling.
- Optimize arbitrary extension code by assuming its render callbacks are pure.
- Patch dependencies, inspect Pi private fields, introduce another terminal writer, or expand this into a general renderer replacement.

## Decisions

### 1. Measure the complete competing workload before remediation

Extend existing independent producer/replay support with real built-in `write` argument streaming and execution/completion phases, not a plain text approximation of its hint. Exercise 258 and 2,000 lines, cold/warm preparation, a long single line, path-bearing code, a long settled history, repeated pointer reports, changing drag endpoints, typing, and an 80 ms visible working indicator. Include wheel-only scrolling without selection, sustained movement in both directions, rapid reversals at boundaries, all scrollbar speeds, retained selections, detached reading, and return to the live tail. Compare stream-only, selection-only, wheel-only, and combined runs at 120x30 and 192x54.

Record preparation calls/time, semantic and presented revisions, layout/base-row reuse, requests versus actual frames, terminal bytes/rows/clears, optimization/fallback causes, timer delay, and event-loop delay. Capture a combined failing baseline before changing production behavior. Raw private prompts are not needed: use generated fixtures and bounded payload-free summaries.

Alternative rejected: measuring only final cells, a fast selector, or row-cache unit tests. Those omit synchronous preview preparation and timer contention.

### 2. Apply input semantics immediately; coalesce only presentation

Keep press, motion, release, wheel, keyboard, copy, resize, and ownership changes ordered. Do not drop intermediate motion semantics: a drag that leaves and returns to its anchor is not equivalent to no motion. Update the latest pointer position even when no paint is necessary so newly revealed controls have correct hover state.

Request interaction paint only when endpoint/range, hover, ownership-dependent styling, cursor, or another visible state changes. Duplicate same-cell reports with unchanged geometry and state perform no new composition or write. Keep edge-auto-scroll on its existing independent 30 ms timer; repeated edge reports neither accelerate it nor postpone it.

Maintain one current interaction presentation and accumulate damage against the last presented selection, not merely the previous received endpoint. The first changed input remains eligible for immediate runtime presentation, without waiting for the 33 ms stream interval. Bounded safe-input drains yield between batches instead of consuming an unbounded queue; preserve conservative barriers for unknown/opaque input and never reinterpret their bytes.

Alternative rejected: debounce the whole mouse stream or keep only the last raw report. Both lose release/drag semantics or make selection wait for silence.

### 3. Retain content layout and compose only changed layers

Track content/layout, interaction, transient-status, dock, and theme revisions independently. Retain document block layouts and prompt-anchor indices; use indexed document/tail access rather than concatenating the complete transcript for every pointer or spinner frame. Update affected block extents when content changes. Reuse live as well as finalized block rows when their prepared revision and presentation inputs are unchanged.

Build selection/wheel/hover/status frames over the established prepared content; scrolling reuses overlapping rows and prepares only newly exposed uncached content, not the entire off-screen history. An input-only frame need not prepare a newer pending content revision; its hit testing remains tied to the displayed geometry. The next content frame must combine its newest eligible semantic revision with the latest applied interaction state, never restore a captured old selection. Geometry/reflow, sticky rows, rail changes, theme, image/link state, and surface ownership invalidate the affected proof. Do not label an older frame with newer revision metadata.

Remove broad transcript invalidation from ordinary status/editor synchronization. Keep true theme/output-mode changes explicit. Cache keys include the owned block revision, width, expansion, theme generation, output padding, image/thinking presentation, and renderer identity as applicable. Bound variants and release them on block removal, session replacement, and disposal. Do not use content serialization as a per-input cache lookup.

Alternative rejected: caching only the final whole screen. It misses independent spinner updates and creates stale selection/hit regions when content changes.

### 4. Make tool preparation frame-bounded and revision-aware

Store engine block updates immediately, marking their built-in presentation dirty without running its formatter on every chunk. Prepare only the latest eligible revision per live block at the content cadence. Completion supersedes pending partials and becomes immediately eligible; it does not wait out an old stream timer. Engine events, extension lifecycle callbacks, command outcomes, and semantic consumers remain current.

Within the bare-A1 presenter policy, suppress unchanged expansion and lifecycle setters. Use an owned public renderer-definition decorator to reuse deterministic built-in call/result components across setter calls that do not change their presentation inputs. Keep partial-versus-complete highlighting distinct: cache invalidation must include the relevant renderer context, not just an arguments object identity. Do not memoize opaque extension renderers without an explicit supported contract, and do not change their callback sequence as an accidental consequence of the built-in optimization. Comparison profiles bypass this policy.

For the collapsed built-in `write` preview, retain source/line-count metadata and a bounded preview prefix; update append-only line metadata from the delta and retain a correct replacement path. Highlight unchanged visible content zero additional times. Whole hidden-content highlighting must not run merely because selection, wheel position, spinner, or unrelated status changed. A public owned preview helper may avoid hidden highlighting only where pinned conformance proves identical partial/final colors and text, including multiline syntax, trailing blank lines, tabs, Unicode, and long-line wrapping.

If exact highlighting for a supported input requires content-sized work that exceeds the interaction slice budget, perform that pure preparation in one lazy owned worker using the pinned public highlighting API and captured theme inputs. A promise around synchronous highlighting is not isolation. Keep one active job and at most the newest pending source snapshot per dirty block, bounded by existing tool-input limits; cancel superseded/removal/session jobs and discard results with stale block/theme/expansion identities. A small owned prefix must not grow into a fork of the complete tool renderer. Expansion exposes the exact complete content; expensive preparation must not block later input, and the existing preview remains until the correct expanded representation is ready. Completion state remains immediate even when nonsemantic highlighting work is pending. Worker packaging, failure recovery, and cold-start evidence are required if this fallback is used; do not silently fall back to an oversized UI-thread task.

Alternative rejected: merely moving all repeated formatting inside `render()`. That still makes an input-triggered frame pay for every pending tool update. Increasing output limits or rendering fewer source lines to the agent is also unrelated and changes semantics.

### 5. Acknowledge presented work, not input receipts

Give the presentation coordinator explicit dirty revisions and deadlines for interaction, content, and transient status. Input requests preempt stale visual work, but only a composition/presentation that represents a content revision can satisfy that revision. Receiving a no-op report cannot cancel its only pending presentation. Separate prepared content from what was actually submitted to the terminal.

Use the existing single runtime/terminal writer. Merge due status and content work into an eligible frame when cheap; otherwise present interaction against retained content and preserve the pending content deadline. Once content is due, new input must not repeatedly move that deadline later. Bound synchronous preparation slices so timers and input get event-loop opportunities. Never replay missed spinner frames in a backlog: show its newest available frame while preserving lifecycle and configured cadence. A hidden off-screen status stays hidden and does not trigger unnecessary transcript paint.

Alternative rejected: acknowledging every receipt as an immediate presentation or assigning strict input priority without fairness. The former loses pending stream work; the latter can starve content indefinitely under continuous motion.

### 6. Prove selection-aware movement rather than removing the safety guard

Extend the neutral frame evidence with the previous/next selection paint ranges and revision correspondence needed to prove movement. The owned viewport remains the semantic authority. The adapter accepts a followed shift only when geometry, source-row correspondence, final selection styling, and its pinned one-write grammar agree. Move reusable cells within the transcript rectangle, then repaint exposed rows, changed selection endpoints/ranges, live-content damage, and changed sticky/rail/control/dock rows. Keep semantic copy boundaries independent of terminal coordinates.

Held and released selections use the same proof; neither alone is a blanket veto. Reflow, stale evidence, unknown grammar, images, explicit terminal hyperlinks, overlay/replacement ownership, or unsupported capabilities retain the conservative fallback. Selection-aware movement must not broaden hyperlink safety or the live-tail allowance established by the related flicker change. A stationary selected range that moves with a proven pure append is the first positive fixture; ambiguous cases remain negative fixtures.

Alternative rejected: freeze follow-tail during selection or delete the adapter's selection check. The first changes requested behavior; the second can move highlights onto unrelated text.

### 7. Preserve wheel semantics while eliminating forced scroll repaint

Deliver each owned wheel report in receipt order and apply its configured row distance, clamping, pointer coordinates, activity/hover changes, and follow/detach transition against the state produced by earlier actions. Never retain only the last wheel delta or sum opposite deltas before clamping: at a boundary, those shortcuts change the final position. Preserve keyboard bytes in mixed chunks and modal/replacement ownership. Maintain one latest eligible viewport presentation; superseded intermediate positions need not be painted, but the final position must equal sequential handling, including interleaved content and geometry changes.

Remove the unconditional forced render from ordinary wheel scrolling. Use the existing immediate-input eligibility without discarding the previous screen. A boundary wheel report with no position, activity/hover, or other visible change needs no paint; a newly visible rail or changed control hover still does. Deliberate link cleanup remains a distinct bounded damage request, not an excuse to force-reset every scroll.

Extend the semantic movement proof from followed positive shifts to signed, overlapping document-range movement caused by wheel input, including detached ranges and selection. Verify both previous and next source mappings. Regional movement is allowed only when its source/selection/terminal safety is proven; repaint exposed rows and changed sticky, rail, bottom-control, transient, and dock cells. Restore terminal scroll margins within the same write. A jump with no overlapping rows repaints the viewport, not unrelated dock rows; unknown grammar, unsafe links/images, resize, or stale evidence uses the conservative fallback without claiming a fast path. Do not weaken the existing followed-stream live-tail budget to admit arbitrary scroll damage: classify wheel movement explicitly.

Scrolling away must keep the chosen reading position while content continues to accumulate; reaching the end restores follow. No new scroll smoothing, dropped distance, automatic selection clearing, speed changes, or paused agent execution are introduced. Keep the newest off-screen status state without pinning or repainting it over detached content.

Alternative rejected: increasing wheel speed to hide delayed movement, debouncing until the wheel stops, globally disabling hyperlink cleanup, or summing a burst into one raw delta. These respectively change navigation, create catch-up lag, regress correctness, or violate boundary semantics.

### 8. Acceptance combines deterministic budgets and physical responsiveness

Required evidence asserts: zero preparation/composition/writes for truly no-op input alone; zero unchanged built-in content re-highlighting for selection/wheel/status frames; at most one content preparation per eligible block revision plus declared lifecycle transitions; bounded pending presentation state; no stale endpoint, viewport position, or partial after final; and timer/content progress during an ongoing input burst. Selection-only composition must not scan/copy off-screen history; wheel composition must reuse overlapping prepared rows without scanning/reformatting unrelated history. Safe selected and wheel shifts repaint only declared damage, with fallback reasons recorded. Include exact scroll distances and follow states against a sequential reference, preview, expansion, selected cells, copy, cursor, transient-tail, and restored-terminal checks.

On the acceptance machine, record p50/p95/max input-to-paint separately for selection, wheel scrolling, and typing, visible spinner inter-frame gaps, and content freshness for stream-only and combined runs. Scrolling must start promptly, reverse promptly, and stop without a queue of old positions catching up after the wheel stops. Target p95 input-to-paint at most 50 ms and no interaction-induced spinner gap above two nominal 80 ms periods in the declared workload; these are local acceptance targets, not flaky shared-CI wall-clock gates. Physical lag or incorrect output fails acceptance even if deterministic tests pass. Regular-mode terminal-owned selection is not equivalent to owned fullscreen selection; compare those mechanisms explicitly and include same-mode pinned controls where applicable.

## Risks / Trade-offs

- **[A deferred content frame selects different text]** -> Hit test against displayed geometry, carry source/selection revision evidence, and test content reflow and release/copy barriers.
- **[Memoization changes syntax or extension behavior]** -> Limit it to declared deterministic built-ins, include all context/theme inputs, and compare pinned partial/final/expanded output and opaque extension callback sequences.
- **[One remaining highlight call still blocks input]** -> Measure cold and warm supported cases; use bounded preview preparation or the isolated pure-preparation fallback, not timing concealment.
- **[Worker/cache growth retains large sources]** -> Bound jobs/variants, keep latest pending revisions only, cancel stale work, and verify teardown and packaged resolution if used.
- **[Fairness makes input wait behind content]** -> Bound synchronous slices, retain an immediate interaction-only path, and test both input and content progress rather than throughput alone.
- **[Selection or wheel movement damages terminal link state]** -> Preserve explicit-link/image/grammar fallbacks and the related flicker change's authority split and cleanup rules.
- **[Wheel batching changes distance or follow state]** -> Compare every burst with sequential per-report clamping, including opposite directions at boundaries and interleaved content/geometry/ownership barriers.
- **[Related accepted specifications are not yet archived]** -> Reconcile their current integration state before implementation; do not synchronize or overwrite their artifacts as part of this proposal.

## Migration Plan

1. Establish the combined baseline and phase attribution against the fresh implementation base.
2. Add no-op suppression, revision-aware retained composition, and fair presentation acknowledgment with focused correctness evidence.
3. Remove redundant built-in preparation and isolate expensive remaining work where required by the measured budget.
4. Remove unconditional wheel forced repaint and add selection-aware and signed wheel movement behind proof and replay fixtures, preserving conservative fallbacks.
5. Validate independent comparisons and exact-artifact physical behavior before accepting the implementation. No data migration is needed. Rollback reverts the owned presentation policy without changing sessions or installed Pi files; retain diagnostic coverage rather than relaxing budgets.
