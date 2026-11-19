## Context

See `proposal.md` for motivation and the two delta specs for observable requirements. The high-priority content failure crosses engine lifecycle, event delivery, component payloads, independent presentation invalidation, viewport caches, and terminal publication. Native-link ghosts and wrapped-target repair are a separate stream in [issue #353](https://github.com/timurproko/a1/issues/353), not prerequisites for content acceptance.

The current path is:

```text
Pi message/tool events
  --> owned engine block state --> bounded delivery queue
  --> shell component updates --> stream/input scheduler
  --> Pi transcript/tool rendering --> owned block/document caches
  --> existing link policy --> viewport/selection/control composition
  --> Pi fullscreen differential --> owned damage adapter
  --> terminal cells and native hover decoration
```

Read-only probes against `c3bf0d2d` established the following. These are investigation observations, not committed test baselines or physical acceptance:

| Boundary | Observation | Confidence and consequence |
| --- | --- | --- |
| Engine tool lifecycle | Assistant `message_end` finalizes each call declaration; the guard added by `f5316694` rejects the subsequent `live` execution start/update. A probe stayed at revision 4 with arguments text instead of live output. | Reproduced semantic rejection; no links or terminal required. The shell has a matching status guard. |
| Run reconciliation | `agent_end.messages` contains newly generated messages, but `#rebuildTranscript` replaces the whole transcript with it. A probe lost its earlier user block until `agent_settled` read the complete session messages. | Reproduced intermediate semantic deletion. Whether both states paint depends on scheduling; do not label it proven permanent history loss. |
| Renderer payload | A supplied result `details.diff` did not reach the registered renderer because the facade supplied only text content and error state. | Reproduced payload loss. Pinned edit result rendering depends on that metadata. |
| Presentation invalidation | A custom renderer changed from BEFORE to AFTER and invalidated; direct component rows showed AFTER, the root retained BEFORE, and the real render-request count stayed zero. | Reproduced facade/cache failure at unchanged semantic revision. |
| Link construction (deferred) | At width 40, a wrapped bare URL gained a truncated first-row target and an unlinked continuation; a prelinked file label retained its complete target on both rows. | Reproduced target-boundary defect; retained under issue #353, not a content-stream completion gate or proof of the ghost's native cause. |
| Terminal transformation | 240 generated pinned-shaped frame transitions matched original-write replay for cell text, colors, underline attributes, and cursor. | Limited negative evidence against content loss in those tested transformations. Does not exercise Windows Terminal hover, every grammar, overlays, images, or resize. |

Subsequent physical probes found that shared OSC 8 occurrence IDs improve wrapped hover grouping, while ordinary row erasure and ECH still leave auto-detected ghosts. Persistent full clears remove the observed ghosts but are not an approved remedy. Issue #353 records the Windows Terminal 1.24.11911.0 source-backed deferred-pattern-cache explanation and upstream reports. Neither that explanation nor correct cell replay establishes a production fix. Keep these findings and private screenshot/transcript material out of claims of content acceptance; do not publish private payloads by default.

The initial planning base was `fa29f8bd`; PR #348 accepted the combined plan. This approved scope amendment is based on `33465f56`. Preserve intervening prompt/editor geometry, modal, and selection refinements. Existing local implementation and evidence remain isolated; integrate this amendment coherently before resuming under its revised acceptance gate.

## Goals / Non-Goals

**Goals:**

- Make execution state, semantic transcript membership, renderer data, and presentation dirtiness separate authorities with explicit lifetimes.
- Keep source identity and content stable while permitting bounded presentation coalescing and legitimate Markdown reflow.
- Match vanilla pinned Pi's content, tool surfaces, styling, and lifecycle behavior outside documented A1 differences, using actual components rather than presentation approximations.
- Remove proven redundant or faulty content-rendering paths while retaining necessary ownership, validation, caching, and responsiveness safeguards.
- Eliminate A1-induced blank, missing, argument-only replacement, and stale-repaint transitions rather than tuning paint to conceal them.
- Produce evidence that locates the first failing boundary and distinguishes legitimate reflow from unnecessary flashing, rather than inferring correctness from a final screenshot.

**Non-Goals:**

- Retaining every token or tool-progress snapshot forever, expanding collapsed tools, revealing deliberately hidden thinking, or overriding existing branch/compaction history policy.
- A new terminal runtime, a general ANSI semantic parser, a dependency upgrade, installed-package changes, private-field access, or prototype patches.
- Link-only repair: pre-layout complete URL targets, wrapped native occurrence grouping, and explicit/host-only ghost cleanup belong to issue #353. Do not alter link recognition, labels, colors, activation, or terminal settings as a content workaround.
- A broad renderer rewrite or removal of unrelated A1 viewport, prompt/editor, modal, or selection features.
- Tuning frame rate to conceal missing content, delaying output until settlement, globally disabling caches, increasing event capacity, or adding ordinary-streaming full-screen clears, separate blank frames, or buffer-switch/rotation tricks to mask defects.

## Decisions

### 1. Keep argument and execution state separate on one invocation identity

Within the owned engine/component boundary, represent argument completion independently of execution disposition. Use the existing tool-call identity through argument streaming, argument completion, execution, and result publication. Map message completion to the argument flag; only actual execution completion or the pinned abort/error disposition closes the execution. Finalized semantic blocks must not mean that a renderer can never update again.

```text
arguments streaming --> arguments complete --> execution running --> execution settled
        |                      |                       |
        +----------------------+-----------------------+--> aborted/failed as reported
```

Update both engine upsert and shell application guards to evaluate revision/generation and the correct phase. Reconciliation of a message's tool declarations merges arguments without replacing a later execution result, error state, or attachment ownership. A repeated `turn_end` declaration is not a new invocation. Final result events remain barriers in bounded delivery, while newer complete partial state for the same still-running invocation remains coalescible. Preserve the queue's protected outcomes, ordering segments, generation invalidation, and overload protocol.

Alternative rejected: remove finalized-state guards globally. That admits obsolete partials after actual completion and defeats the protection introduced by `recover-history-and-bound-ui-events`. This design narrows the meaning of completion rather than abandoning monotonicity.

### 2. Never use a run-local list as a whole-session replacement

Treat ordinary `agent_end` as a run lifecycle boundary with a run-local collection. Keep the incrementally accumulated complete transcript; reconcile supplied new messages by identity only where necessary. Do not publish a shortened full view in anticipation of a later settlement repair. Use a complete session-authoritative collection for an actual full reconciliation at the appropriate settlement/session operation, preserving equal blocks and their revisions.

Explicit session/branch replacement and existing compaction behavior still reconcile their actual authoritative scope and invalidate obsolete generations. This change neither creates a second durable conversation log nor promises retention outside those policies. Add a named distinction between run-local input and replacement-authority input at the integration boundary so future event changes cannot silently interchange them.

Alternative rejected: append every message from every completion array. That duplicates messages and misrepresents branch replacement. Alternative rejected: postpone all output until settlement. That conceals the bug by removing live presentation.

### 3. Separate renderable payloads from bounded diagnostic summaries

Define validated owned presentation fields for invocation arguments, text/content parts, supported structured details, partial/error state, and attachment references. Convert them once at the Pi boundary and feed the actual public tool renderer with the representation it expects. `jsonSummary` remains useful for diagnostics but is not an authority for renderer data; avoid truncating rendering arrays/objects merely because the diagnostic summary is bounded.

Retain the newest accumulated text without serializing it per chunk. Queue nodes continue to use the established bounded references/reconciliation mechanism where appropriate; do not add unbounded payload snapshots to compensate. Asset bytes remain behind the existing asset resolver, with current supported limits and explicit unavailable/hidden fallbacks. When result references change, update or rebuild the attachment presentation without replacing invocation identity or losing its renderer state. Preserve the existing error isolation and fallback policy.

In particular, a final edit diff is authoritative even if a preview was never produced or a post-edit filesystem read cannot reproduce it. Both partial and final extension renderers receive their supported details. Ordinary text-only tools retain their current layout.

Alternative rejected: recover missing diffs from a fresh read of the edited file. It races the actual operation and subsequent edits and cannot reconstruct arbitrary extension metadata. Alternative rejected: pass raw vendor objects across product state. Keep vendor types and validation within the owned integration contract.

### 4. Propagate presentation invalidation through every cache

Replace the transcript renderer's no-op runtime notification with an owned callback bound to the mounted block/component instance and session generation. A valid renderer invalidation advances a presentation revision, dirties that block's rendered rows and dependent document layout, invalidates any pending dock-only reuse proof, and requests the existing runtime presentation path. It does not invent an engine event or modify persisted message data.

Cache identity distinguishes semantic revision from presentation revision, alongside width and existing theme/settings inputs. Reflow refreshes downstream row offsets, live-tail extent, viewport range, selection mapping, and link/control geometry. Unchanged components remain cached; off-screen invalidation marks work stale and does not eagerly render the entire transcript. Continue using the existing layout machinery rather than introducing a parallel geometry authority.

A callback from a disposed/replaced component is ignored using its mount token, even if a newer component reused the same semantic ID. Coalesce repeated notifications; do not trigger recursive render/invalidate loops while rebuilding a component. Document the distinction between public renderer invalidation and root-wide theme/settings invalidation, and make both invalidate the caches whose outputs they affect.

Alternative rejected: bump semantic block revision for every asynchronous visual change. That contaminates event ordering, completion counts, and authoritative content state. Alternative rejected: remove finalized-row caching. It restores neither missing scheduler notifications nor bounded long-session performance.

### 5. Prefer pinned content rendering and remove proven redundant paths

Keep the pinned public transcript/tool components as the presentation authority. Supply their complete supported inputs, lifecycle flags, attachment resolution, and render notifications through the smallest coherent owned adapter. Do not replace a real edit/tool renderer with an A1 text approximation, reproduce its layout in parallel, or add another scheduling or geometry authority to compensate for missing data.

Audit touched content adapters and caches for duplicate result reconstruction, competing lifecycle decisions, dead invalidation paths, and redundant layout transformations. Remove or consolidate a path only when source-faithful tests show that it is unnecessary or causes the confirmed failure. Record the reason and independent parity evidence for each simplification; if a path is necessary for bounded delivery, session ownership, sanitization, stable-row reuse, or a documented A1 feature, retain it. This is a targeted refactor, not a mandate to remove every cache or the owned viewport.

Use documented renderer injection and public components first. If the public surface cannot preserve a supported content behavior, keep any necessary source-derived adaptation minimal, attributed, and within the Pi integration, with independent styled-row and lifecycle comparisons. Do not inspect private children, patch shared prototypes, modify installed packages, or port the fullscreen renderer. Keep the explicit pinned comparison route untouched.

Compose the newest eligible content with current viewport, selection, modal, and dock state through the existing scheduler. Renderer changes must not expose an artificial blank frame, remove an otherwise visible surface, or allow an older pending frame to restore stale rows. Keep damage decisions downstream of semantic rendering and retain existing bounded cleanup and conservative movement safeguards. Ordinary streaming is not a reason for a full clear; established unsafe-paint recovery remains distinct and must not be broadened to hide content defects.

Alternative rejected: a large renderer rewrite that might incidentally reduce flashing. It obscures the first failing boundary and risks unrelated UI behavior. Alternative rejected: masking omissions with repaint frequency or unconditional clears. It cannot restore discarded payloads and adds perceptual instability.

### 6. Test the pipeline with source-faithful events and real renderers

Turn the read-only probes into failing deterministic regressions before changing production code. Use production ordering, multiple assistant messages, serial and parallel tools, real result details, existing history, and delayed settlement. Test final result restatement, stale partial delivery, same-session reconciliation, and actual generation changes. For asynchronous renderers, assert not only the callback but the root's next rows and terminal output, including off-screen invalidation and replacement/disposal races.

Extend the existing evidence harness instead of treating simplified `Text` output as a pinned tool oracle. Run independent actual tool components or the untouched pinned process with equivalent deterministic inputs. Keep both explicitly stepped diagnostic cases and ordinary scheduled/burst cases without a `renderNow()` after every event. The former locates a bad transition; the latter proves it is not hidden by the harness's artificial paint boundaries.

Record bounded correlations between source event/invocation IDs, semantic revision, presentation revision, document/visible range, write-local damage decision, emitted writes, and checked cells. Use isolated public/example targets and synthetic tool data by default; bound and sanitize diagnostics and do not print telemetry into normal transcript/status output. Add negative controls that deliberately reintroduce rejected live output, run-local replacement, discarded details, stale row caches, and artificial blank/stale intermediate presentation so each content gate proves it can fail. Preserve link-only counterexamples and probe findings as explicitly unresolved evidence associated with issue #353, not as passing content-fix claims or silently deleted regressions.

Physical content review uses the exact built artifact at representative sizes including 192 by 54 and a narrow wrapping size, through ordinary streaming and user input rather than only forced diagnostic paints. Compare actual pinned content/tool rendering with equivalent inputs and document existing A1 differences. Record whether a missing or flashing surface is assistant text, thinking, code, live tool output, an edit diff, or an attachment; compare source/session content, component rows, desired rows, writes, and physical cells before declaring the cause. Both automated correctness and user-controlled content stability must pass; fewer clears or matching final text alone is insufficient.

The user-approved scope split allows content acceptance while the pre-existing native ghosts or wrapped-target defects remain explicitly open in issue #353. It does not permit a new link regression, waive other changes' contracts, or declare overall native-link correctness. Closing this change must reference the remaining link issue and must not close it. Any surviving content omission, resize/reopen dependency, or unexplained A1-induced flashing still blocks content acceptance.

## Risks / Trade-offs

- [More faithful payloads increase retained data] -> Preserve existing queue/asset limits, keep diagnostic summaries separate, retain newest state by identity, and test large partial/final results without per-chunk serialization or silent loss.
- [A semantic-finality repair lets old updates revive results] -> Test execution-specific barriers, repeated declarations, monotonic revisions, and component/session generations at both engine and shell boundaries.
- [New presentation callbacks create render loops or invalidate everything] -> Coalesce dirty notices by mounted block, retain separate semantic/presentation revisions, and measure unchanged-block reuse and off-screen work.
- [A preview completes after a final authoritative diff] -> Prefer final result data and reject obsolete preview/instance callbacks so stale filesystem-derived state cannot overwrite the result.
- [Refactoring changes pinned content layout or removes necessary safeguards] -> Prefer public components, compare independent styled rows and lifecycle behavior, document each retained A1 difference, and remove only proven redundant/faulty paths.
- [Correct final cells hide transient flashing or omissions] -> Exercise intermediate and ordinarily scheduled presentations plus exact-candidate physical review; do not accept lower frame/clear counts as a substitute.
- [The scope split is mistaken for a link fix] -> Keep issue #353 open with the physical findings and known target regression; report it at handoff without making host-only cleanup a content gate. Preserve existing link behavior and reject newly introduced link regressions.
- [Other active changes touch selection, modal input, or damage metadata] -> Re-read the current integration base and keep their ownership and bounded scheduling contracts; do not reset their artifacts or acceptance claims in this planning change.

## Migration Plan

1. Integrate this OpenSpec-only scope amendment after acceptance. Reconcile local implementation task progress by description; removed link tasks belong to issue #353 and are not completed content tasks.
2. Preserve source-faithful failing evidence and the corrected execution/reconciliation work. Record known content baseline facts and explicitly unreproduced physical cases without waiting for host cleanup.
3. Preserve renderer payloads and attachment presentation, then wire presentation revision/invalidation through the caches and real scheduler. Simplify proven redundant content paths alongside these repairs.
4. Run focused correctness, scheduling, independent pinned parity, bounded-work, and terminal-presentation evidence, retaining link fixtures as non-regression coverage and separately identified known defects.
5. Obtain required CI and user-controlled exact-candidate content acceptance. Leave the implementation PR open until the user reports acceptance and explicitly authorizes merging; report issue #353 as a separate unresolved follow-up.

No persisted session-format or settings migration is needed. Rollback uses the isolated implementation commits and restores existing contract adapters without rewriting session files. A remaining content omission or unnecessary A1-induced flashing prevents completion. A separately tracked pre-existing link defect does not prevent content acceptance under this approved split, but is not repaired or waived by it.

## Open Questions

- Which exact installed/build artifact and environment produced the original disappearing-content screenshots? Known probe facts do not identify that original content candidate. Record during content baseline reproduction without requiring a terminal-settings change.
- Which category of generated content vanished in the reported session, and did resizing/reopening restore it? This selects the physical reproduction cases among the already scoped semantic and presentation failures; it does not gate the confirmed regressions.
