## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior and acceptance contract. Design is needed because this is an ordering and cache-provenance defect with a performance constraint, and because the physical report is broader than the demonstrated failure.

### What is known

The investigation used installed release `0.1.8-dev.299-a509778659d833cdf876`. The relevant source on planning base `50d5850b` retains the same reuse predicate. The installed controller already remembers coordinates from all routed mouse reports, and `TranscriptViewport.compose` derives bottom hover from those coordinates and the newly calculated hit rectangle. The archived `fix-jump-to-bottom-stationary-hover` fix is present, not missing.

A read-only probe created the installed owned shell root with a 60-column by 16-row terminal geometry and a busy, overflowing transcript. Normal hover worked, and 100 full compositions with growing assistant content retained hover. This is isolated composition evidence, not terminal-paint or physical acceptance.

The probe then established an unhovered detached frame, called `handleInput("x")`, delivered an SGR no-button motion report into the button, and composed once. That first frame was unhovered and the dock-only composition count increased. A second full composition restored hover. No deterministic regression file or terminal trace was retained in that investigation; implementation must reproduce and preserve the failure before fixing it.

### Existing path and failure

`OwnedUiSessionShellRoot.handleInput` marks safe keyboard input as a dock-only candidate and captures `#dockInputSnapshot`. In `render`, the reuse predicate compares the published snapshot's viewport revision with the revision captured at keyboard receipt when that snapshot exists. A later pointer report increments `SessionViewportController.presentationRevision`, but that current value is only the fallback operand, so it is not checked in the failing path.

`composeDockOnly` preserves the previous transcript rows and hit regions. The root then records current controller and document metadata as the new visible snapshot even though it may have reused older output. This can misrepresent what was composed and allow subsequent reuse to build on that mismatch. The existing selection-revision check in the neutral viewport does not cover hover; the existing live transient-signature check does not cover all intervening input or document changes.

```
painted frame P, unhovered
        |
keyboard input captures P as reusable
        |
mouse enters button; current interaction becomes Q
        |
reuse compares P with saved P, not current Q
        |
old transcript is reused; metadata can claim Q
```

The existing shell streaming responsiveness test checks button discovery and click activation after streamed events and explicitly renders the root. It does not prove the first scheduled terminal presentation carries the hover background. The stationary-hover tests normally render between actions, so they do not cover the demonstrated interleaving.

## Goals / Non-Goals

**Goals:**
- Make dock-only reuse a composition-time proof, not permission retained from an earlier input callback.
- Keep composed output and the identity/revisions used to describe it coherent.
- Verify correctness at controller, shell scheduling, and terminal-cell boundaries without an extra render masking the failing frame.
- Keep idle same-height typing cheap and use existing stream/input coordination rather than introducing a second scheduler.

**Non-Goals:**
- Redesigning button placement, colors, label semantics, scrollbar/sticky behavior, or the accepted transient-tail ownership.
- Reimplementing the stationary-cursor fix, polling the OS pointer, synthesizing motion, or changing mouse-reporting modes.
- Globally disabling dock reuse, forcing full-screen repaint on hover, tuning general streaming cadence, or replacing the terminal renderer.
- Changing `a1 pi`, installed Pi packages, or taking over the broader `stabilize-streaming-rendering` acceptance work.
- Assuming that editor input occurred during the user's scroll-only report. Any additional cause outside this scoped reuse/presentation path requires a separately agreed plan rather than speculative implementation here.

## Decisions

### 1. Revalidate against live composition inputs

At the point where `render` decides to call `composeDockOnly`, require the cached viewport's interaction and selection revisions to agree with the current controller revisions. A saved keyboard-receipt snapshot can describe a candidate but cannot replace this comparison. A mismatch takes the existing full viewport composition path while preserving valid settled transcript-block caches.

Apply the same provenance rule to existing content, transient, geometry, and input-surface checks: compare stable document/layout identities or explicit invalidation revisions at composition time rather than comparing two saved references. In particular, do not use the freshly concatenated `scrollRows` array identity as the live validity token; it is newly allocated each render and would disable reuse even for unchanged typing. Prefer existing cached document-layout identity plus the existing transient signature; add a narrowly scoped revision only if existing identities cannot prove validity.

Alternative: cancel a dock candidate in every mouse handler. Rejected as the sole safeguard because it couples two owners and misses non-mouse invalidations. Alternative: always fully compose. Rejected because it discards the accepted bounded typing behavior.

### 2. Publish only the state represented by the frame

A full composition publishes the viewport inputs actually used to produce its rows and hits. A dock-only composition retains the proven viewport provenance and updates only the dock-dependent result. Never overwrite a reused transcript's provenance with newer document or interaction state that was not composed.

If a supported synchronous callback changes input during composition, retain the revision of the composed snapshot and keep the newer update pending for one ordinary next input presentation. Do not falsely acknowledge the newer revision or add a self-sustaining correction loop. Existing selection-during-composition behavior is the model to preserve, not a reason to patch Pi internals.

Alternative: let the next spinner or token repair the first frame. Rejected because the feedback may remain stale when output pauses, and a correct later frame is not a correct first presentation.

### 3. Preserve pointer authority and existing scheduling

Keep `SessionViewportController` as the pointer owner and the neutral viewport as the owner of geometry-derived hover styling. Preserve the existing input-coordination barrier for mouse reports and stream-preemption behavior. The fix normally belongs in the shell reuse guard and snapshot publication, not in event parsing or a new hover boolean.

Use the existing input presentation opportunity, not a new zero-delay timer or an unconditional forced repaint. Isolated hover changes with stable content and no hyperlink cleanup should produce ordinary differential damage to the control row. Wheel and hyperlink-cleanup paths retain their independently justified behavior; their current forced-render cases must not be confused with a new hover repaint requirement.

Alternative: force rendering for every motion report. Rejected because it hides the stale-cache decision, increases paint damage, and can worsen the streaming interaction being investigated.

### 4. Test the first scheduled paint with controlled ordering

Preserve the failing editor-then-hover sequence as a deterministic regression, covering both entry and exit. Add wheel reveal/hide and follow restoration after keyboard input, pointer reset, content changes of unchanged height, and label/geometry changes before composition. Include the reverse ordering as a control and a subsequent typing frame to detect falsely advanced provenance.

Use the existing terminal double, runtime input entry, input scheduler controls, stream coalescer controls, and terminal cell replay in `test/support/rendering/terminal-paint-evidence.ts`. Establish the initial frame once, deliver the declared interleaving, then advance exactly the first eligible scheduled presentation. Do not call `root.render` or `renderNow` to obtain an actual result after the report: such calls can consume the stale frame and make the assertion pass on its repair. Reading published metadata without composing is safe.

Replay emitted ANSI into terminal cells and assert the normal versus `selectedBg` control background at known fixture bounds, together with current editor cells. Keep ANSI backgrounds and explicit truecolor theme setup. Inspect later streaming/completion writes for regressions. Exercise synchronized-output honored and ignored replay where supported, and retain the existing damage budgets rather than imposing a new global latency threshold.

Alternative: compare label text or assert that a click jumps. Rejected because both can pass when the visible hover is wrong. Alternative: wall-clock sleeps as the ordering oracle. Rejected because they can skip the failing first frame and make CI timing-dependent.

### 5. Separate scroll-only evidence from the proven cache race

Run a distinct workload with an overflowing detached transcript, assistant and tool stream updates, spinner ticks, wheel input, hover entry/exit, and repeated stationary hide/reveal; send no editor input. Capture the same control-cell checkpoints before streaming stops. Exercise compact and large geometry, including 60 by 16 and 192 by 54, and keep a no-stream control.

For diagnosis, use a bounded test sink or an explicitly enabled capture through owned boundaries. Record sequence numbers, relative monotonic times, decoded mouse kind/coordinates, routing disposition, published/candidate/current revisions, frame identity, bottom hit bounds, expected hover, reuse/recompose decision, and control-cell paint results. A real-session trace must omit keyboard payloads, transcript text, link targets, and credentials; full-frame ANSI replay belongs only to synthetic fixtures. Declare an event limit and truncation flag so incomplete coverage cannot masquerade as a missing report. No always-on logging or new public CLI is required.

Classify results separately:
- No corresponding report in a complete captured interval: input-reporting observation, not proof of this cache race.
- Report received but old composed state: owned routing/reuse/presentation defect.
- Correct composition but incorrect emitted/replayed cells: terminal-paint defect.
- Correct emitted cells but a physical miss: host/rasterization investigation remains open.
- No reproduced failure or incomplete capture: inconclusive for the physical symptom.

Alternative: declare the user report fixed when the editor race test passes. Rejected because the read-only evidence does not establish that causal link.

### 6. Keep physical acceptance explicit and scoped

The exact built candidate must be tried in the user's terminal with sustained output, wheel-only detachment, hover entry/exit, and stationary hide/reveal, both with and without editor activity. Record terminal/version, dimensions, theme/color mode, viewport settings, and whether a click worked when hover failed or moving away and back restored it. Those observations refine attribution; they do not alter the behavior contract.

Record the cache-race verdict separately from the scroll-only symptom. If the symptom persists or cannot be assessed, do not mark this complete. A maintainer may later explicitly narrow or split the remaining work, but this plan does not silently authorize closing it as fixed.

## Risks / Trade-offs

- [Fresh array identity makes every frame look changed] -> Compare stable document-layout identities or revisions and retain a regression proving same-height typing still uses dock-only composition.
- [A guard is corrected but publication still blesses stale rows] -> Test a second keyboard frame and content updates between input and composition, not only the first hover entry.
- [Tests repair the stale frame while inspecting it] -> Assert captured writes from the first scheduled presentation before any extra render and keep a failing pre-fix fixture.
- [Spinner or hyperlink cleanup causes legitimate broader damage] -> Isolate hover-only budgets from mixed workloads and label independent damage causes.
- [Terminal reports differ from synthetic SGR input] -> Keep physical acceptance and bounded report-to-paint diagnosis; do not invent unreported coordinates.
- [Diagnostics leak conversation or become expensive] -> Use opt-in bounded metadata with explicit truncation; synthetic fixtures alone may retain complete terminal writes.
- [Other changes touch viewport layout or input reuse] -> Rebase the eventual implementation on current accepted code and preserve the restored steering/working transient-tail model without rewriting unrelated requirements.

## Migration Plan

No persisted state or settings migration is needed. After this specification integrates and implementation is explicitly requested, first capture the deterministic failing regression, then correct reuse validation/publication and add scheduled terminal-paint evidence. Use the existing CI gates and exact-built physical check before accepting the code. If validation contradicts the claimed fix, keep the implementation unaccepted and retain the evidence. Rollback is a revert of the scoped code change; no package or terminal-protocol migration is involved.

## Open Questions

- Which terminal/version and geometry exhibit the scroll-only failure, and does a click still work or moving away and back restore hover? Capture these during diagnosis and exact-artifact testing.
- Can the scroll-only symptom be reproduced with delivered pointer reports in the owned pipeline? The separate workload and trace classification answer this; no additional cause is assumed in advance.
