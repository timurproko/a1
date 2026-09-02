## Context

See `proposal.md` for motivation. Terminal input currently enters the public Pi TUI terminal, passes through the A1 runtime pre-input boundary, and is synchronously delivered to the focused editor or replacement surface. Pi TUI then schedules an immediate render with `process.nextTick`. This is correct for one key, but an immediate custom-viewport render can run before Node services another terminal data callback.

The default and custom layouts share Pi input components and semantic handlers. Their presentation paths diverge after semantic input is accepted: `a1 pi` uses the regular comparison layout, while bare `a1` composes the bounded transcript and dock into a fullscreen frame and passes the resulting differential write through A1's damage-aware terminal adapter. Transcript block rows and document layouts are cached, but custom viewport composition still derives the visible frame on every render. Menus and replacement input surfaces use the same fullscreen root, so their lag cannot be attributed only to editor autocomplete or text editing.

`StreamPresentationCoalescer` bounds streamed-output presentation to 33 ms and lets input preempt a pending stream frame. It does not coordinate multiple keyboard callbacks, because keyboard input deliberately requests immediate presentation. The existing rendering producer calls `renderNow()` after scripted actions and its pinned fixture does not implement editor input, so it cannot measure scheduler backlog or input-to-paint latency.

The design must retain the custom fullscreen viewport, public Pi terminal/runtime boundaries, finite-grammar validation, conservative damage fallback, shared input and menu semantics, Unicode/grapheme behavior, overlays, extension surfaces, stream finalization, auto-scroll, and terminal restoration. It must not modify `a1 pi`, vanilla Pi, installed packages, Pi prototypes, or private Pi state.

## Goals / Non-Goals

**Goals:**

- Locate delay independently in input receipt, semantic application, scheduling, composition, terminal writing, and physical presentation.
- Keep the first keyboard-driven presentation immediate while collapsing superseded rapid-input frames into one current-state presentation opportunity.
- Make pure dock input reuse the established transcript viewport and avoid repainting stable transcript rows.
- Preserve exact semantic order and side effects for text, editing, navigation, submit, cancel, interrupt, paste, and recognized terminal sequences.
- Provide deterministic backlog and structural-work gates plus comparable monotonic diagnostics from isolated bare-`a1`, `a1 pi`, and pinned-Pi producers.
- Make exact-artifact Windows Terminal comparison the final responsiveness authority.

**Non-Goals:**

- Changing the 33 ms streamed-output cadence or weakening final stream flushes.
- Replacing the custom fullscreen viewport with regular mode or terminal-native selection.
- Changing editor, list, menu, autocomplete, keybinding, shortcut, or extension semantics.
- Optimizing pointer-selection behavior, terminal transport outside A1's public ports, or unrelated startup/runtime performance.
- Treating wall-clock thresholds from a shared CI runner as sufficient proof of physical-terminal responsiveness.
- Modifying comparison producers to imitate the candidate implementation or deriving pinned expected output from A1 code.

## Decisions

### 1. Model input responsiveness as revisioned phase evidence

The evidence boundary will assign a monotonically increasing input revision to each original terminal delivery and record these phases with a monotonic clock:

1. terminal receipt;
2. start and end of semantic delivery;
3. highest semantically applied revision;
4. keyboard or stream presentation request;
5. frame composition start and end;
6. terminal write start and end;
7. highest input revision observable in the replayed terminal frame.

The result will also record pending keyboard presentations, pending streamed presentation, accepted-but-unpresented revision distance, rendered transcript blocks, composed transcript rows, changed terminal rows, bytes, clears, and damage fallback reason. Production behavior will not depend on timing instrumentation; optional hooks will be injected through A1-owned test/diagnostic ports and omitted in normal composition.

A frame that presents revision N proves all earlier semantic revisions were applied, but rapid workloads are not required to paint every intermediate revision. A superseded frame is one whose composition starts after a newer eligible revision has already been applied yet presents only an older one. The deterministic gate requires no such stale paint after a coordinated drain, at most one pending keyboard presentation, and zero accepted-but-unpresented backlog after the immediate presentation flush.

This phase model distinguishes slow key routing from expensive frame composition and terminal output. It also avoids inferring semantic state solely from elapsed time.

**Alternatives considered:** Measuring only terminal-write duration would miss queued input and stale frames. Timing `handleInput()` alone would miss the fullscreen work responsible for visible delay. Production telemetry was rejected because this change needs deterministic test evidence, not permanent user-input instrumentation.

### 2. Add an independent input-responsiveness matrix rather than extending forced-render workloads

A dedicated producer protocol will execute equivalent workloads for bare `a1`, `a1 pi`, and untouched pinned Pi in separate processes. Each process will receive the same geometry, theme, prepared transcript, focused surface, input deliveries, stream schedule, scheduler controls, warm-up count, and bounded deadline. It will use the normal asynchronous render scheduler; it will not call `renderNow()` after each input.

The matrix will include:

- isolated insertion, cursor movement, grapheme-safe deletion, and submit;
- rapid text/edit bursts delivered as both one terminal chunk and multiple callbacks in one event-loop interval;
- repeated and held navigation in a fixed-height menu and a built-in replacement input surface;
- an editor wrap or surface-height transition;
- an empty and a long settled transcript;
- input before, during, and after a coalesced streamed-output request;
- submit, Escape, interrupt, paste, unknown escape, and extension/custom-surface barrier cases.

The pinned producer remains independent and source-traceable. The candidate may share workload data and terminal replay grammar, but it may not generate the pinned semantic expectation or substitute an A1-authored fake editor for untouched pinned behavior. Producer failures, timeouts, malformed output, missing phases, and terminal-restoration failures are test failures.

Producer launches will remain serialized on Windows. A smoke input workload will capture isolated typing, rapid typing, menu navigation, and stream preemption in one bounded producer session per profile. Full evidence adds the remaining workloads without repeating identical captures merely to satisfy different assertions.

**Alternatives considered:** Extending the current rendering workload format was rejected because forced renders erase the scheduler behavior under test. A single in-process comparison was rejected because module caches, global keybindings, timers, and terminal identities could contaminate results. A physical-terminal-only test was rejected because it cannot prevent recurrence in CI.

### 3. Coordinate only proven-safe input bursts at the A1 terminal/runtime boundary

Bare A1 will add an input-presentation coordinator at an A1-owned public terminal/runtime boundary before focused-surface delivery. It will be enabled only for the custom viewport. `a1 pi` and pinned Pi will retain their current input and rendering paths.

For a proven-safe ordinary text, editing, or navigation delivery, the coordinator will retain the original delivery as an opaque ordered item and schedule one immediate event-loop-turn drain. It will not concatenate deliveries, split escape sequences, decode graphemes, or convert them into A1-specific key commands. During the drain it will invoke the existing input route once for each original item, synchronously and in receipt order. Pi TUI's existing pending-immediate-render guard can then produce one current-state frame after the drain rather than one frame between callbacks.

The safe grammar will be finite and surface-aware:

- ordinary complete text deliveries and recognized editor editing/navigation keys are safe for the default editor;
- repeated selection navigation is safe only for built-in surfaces whose A1 boundary declares ordered burst handling;
- submit/activation, Escape/cancel, interrupt, mode-changing shortcuts, paste framing, terminal replies, unknown escape sequences, and extension-owned or undeclared custom input are barriers.

When a barrier arrives, the coordinator will synchronously drain all preceding accepted items, deliver the barrier exactly once, and leave the resulting immediate render pending. Unknown input fails closed rather than being guessed into the safe grammar. Disposal, focus replacement, resize, stream finalization, and terminal shutdown also flush or cancel through explicit lifecycle rules so no accepted input survives its owning surface.

The coordinator delays a single safe delivery by at most one immediate event-loop opportunity; it never waits for the 33 ms stream cadence or a wall-clock debounce. A barrier is not delayed behind that opportunity. This trades an unobservable scheduling turn for the ability to drain terminal callbacks before expensive fullscreen work, while preserving Pi's semantic handlers and ordering.

**Alternatives considered:** A millisecond debounce was rejected because it would make first-key response intentionally slower and behave differently under load. Combining strings was rejected because it could corrupt control, paste, Unicode, and extension semantics. Patching Pi TUI's `requestImmediateRender`, overriding prototypes, or importing private scheduler state violates the architecture boundary. Applying only the newest key was rejected because navigation, editing, and side effects are not generally idempotent.

### 4. Reuse an established transcript viewport for dock-only keyboard frames

The custom root will maintain a revisioned visible-viewport snapshot separate from its existing rendered-block and document-layout caches. The snapshot will include the transcript/document revision, terminal geometry, viewport-controller revision, follow/detach state, selection and hover state, visible rows, scrollbar/sticky metadata, hit regions, and dock allocation used to establish it.

A keyboard mutation may use the dock-only fast path when:

- transcript/document and viewport interaction revisions are unchanged;
- terminal width and height are unchanged;
- dock height and transcript allocation are unchanged;
- no overlay, image, selection transition, resize, or uncertain metadata invalidates reuse; and
- the active surface's render remains within its declared dock geometry.

The root will still render the changed active surface and return a complete frame through public Pi TUI APIs, but it will reuse the visible transcript rows and metadata instead of recomposing the transcript viewport or rerendering settled blocks. The semantic frame descriptor will identify a stable transcript and dock-only cause. The damage adapter will validate the public TUI differential and require changed writes to remain in the dock; it will not enable a scroll transformation for replacement surfaces or weaken any existing fail-closed condition.

If dock height, viewport state, transcript content, selection, overlay ownership, resize, image state, grammar, or metadata safety changes, the snapshot is invalidated and the current conservative full composition path runs. The newly established frame becomes the next reusable snapshot. This preserves correctness for editor wrapping, autocomplete, queued messages, menus of changing height, pointer state, and modal transitions.

**Alternatives considered:** Caching only transcript block rows is insufficient because visible viewport slicing and metadata are still recomputed per key. Writing dock rows directly to the terminal was rejected because it would create a second terminal/render authority and desynchronize Pi TUI. Treating every replacement surface as damage-safe was rejected because its geometry and paint grammar are not universally known.

### 5. Keyboard presentation preempts stream presentation without creating two schedulers

The input coordinator will notify the existing stream presentation boundary when the first item is received, before any optional same-turn drain. A pending coalesced stream timer will be canceled or marked satisfied by the forthcoming keyboard frame using the existing preemption and immediate-presentation contracts. The keyboard drain will not own a second frame timer.

If stream events arrive while a keyboard drain is pending, their semantic state may be included in the current frame, but they may not cause a stream frame to run ahead of accepted keyboard input. Final message/tool/settlement events keep their immediate flush semantics. After an input-driven frame, a separately due spinner or final stream transition may still request its legitimate frame.

**Alternatives considered:** Merging stream and keyboard events into one generic debounce was rejected because final stream state and first-key input have different immediacy contracts. Letting both timers run was rejected because an older stream frame could consume the event-loop opportunity and restore stale input presentation.

### 6. Gate deterministic responsiveness and report wall-clock parity diagnostically

Automated acceptance will use repository-owned deterministic budgets for:

- exact semantic input order and final state;
- maximum pending keyboard presentations of one;
- zero final accepted-but-unpresented backlog;
- no stale keyboard frame after a coordinated drain;
- bounded frames per event-loop input burst rather than per delivered key;
- immediate scheduling with no stream-cadence wait;
- zero settled transcript block rerenders for dock-only input;
- bounded composed viewport rows and changed terminal rows;
- no unexpected fullscreen clear, stable transcript repaint, or unsafe damage transformation;
- equal structural work for empty and long settled transcripts.

The producer will also report warmed monotonic distributions for receipt-to-application, application-to-compose, compose duration, write duration, first eligible state, and final burst state. Bare `a1`, `a1 pi`, and pinned Pi will be interleaved or normalized within the same evidence invocation, but noisy wall-clock ratios will remain diagnostic rather than the sole CI gate. A bounded producer deadline protects CI from hangs; it is not the responsiveness acceptance threshold.

Final acceptance requires an exact built candidate in Windows Terminal beside `./scripts/dev pi`, testing normal typing, rapid paste-like typing, Backspace/Delete, cursor movement, submit, held arrows in menus, editor wrapping, a long transcript, and input during streaming. The user must observe immediate start, no catch-up after input stops, and current menu selection. A contradictory physical finding reopens the change even when deterministic gates pass.

**Alternatives considered:** Fixed millisecond CI thresholds were rejected because host load and Windows process scheduling make them flaky and they can reward test-environment tuning instead of terminal behavior. Subjective testing alone was rejected because it provides no regression boundary.

## Risks / Trade-offs

- **[One-turn coordination could make an isolated key slower]** → Use an immediate event-loop opportunity rather than a timer, measure first-state phases against `a1 pi`, and retain the path only if exact-artifact testing finds no perceptible start delay.
- **[Input classification could mishandle a fragmented escape or paste sequence]** → Coordinate only complete finite-grammar cases, retain original delivery boundaries, treat paste/protocol/unknown data as barriers, and add fragmented-sequence fixtures.
- **[Repeated navigation can trigger nonvisual side effects]** → Apply every action sequentially; omit only superseded paints, and opt surfaces into burst safety through an A1-owned declaration rather than type guessing.
- **[Viewport reuse can leave stale transcript metadata or hit regions]** → Key snapshots by all semantic and geometric revisions, invalidate conservatively, and replay terminal cells plus hit/descriptor evidence after each transition.
- **[Instrumentation can perturb measured timing]** → Keep phase hooks optional and allocation-bounded, use structural gates as authoritative automation, and compare exact artifacts physically.
- **[The fast path may improve tests but not Windows Terminal]** → Require raw changed-row/byte evidence and physical comparison; do not accept the change on composition timings alone.
- **[Additional producer workloads could reverse validation-speed gains]** → Capture multiple assertions from one immutable input matrix, serialize only cold producer launches, include one deliberate determinism repeat, and use the existing impact-aware smoke/full selection.
- **[An upstream Pi TUI change can alter immediate-render behavior]** → Keep source provenance and pinned-version conformance, fail comparison evidence on changed scheduler assumptions, and avoid private integration points.

## Migration Plan

1. Capture and retain a pre-change input matrix that demonstrates where backlog and structural work diverge for bare `a1` while leaving production behavior unchanged.
2. Add phase/revision evidence and deterministic budget assertions, first against existing behavior so failures identify the intended gap rather than protocol defects.
3. Implement visible-viewport reuse with conservative invalidation and validate isolated editor/menu frames before introducing input burst coordination.
4. Add the finite-grammar coordinator only to bare custom-viewport composition, then validate barriers, lifecycle flushes, stream preemption, and extension/custom-surface fallback.
5. Run strict OpenSpec validation, focused tests, the impact-selected CI gates, and exact-artifact Windows Terminal comparison against `a1 pi`.
6. Roll back by disabling the bare-A1 coordinator and viewport fast path together; the existing conservative fullscreen composition and damage adapter remain the correctness fallback, and no persisted data requires migration.
