## Context

See `proposal.md` for motivation and the two delta specs for observable requirements. A design is necessary because the failure crosses engine lifecycle, event delivery, component payloads, independent presentation invalidation, viewport caches, and host-specific terminal decoration.

The current path is:

```text
Pi message/tool events
  --> owned engine block state --> bounded delivery queue
  --> shell component updates --> stream/input scheduler
  --> Pi transcript/tool rendering --> owned block/document caches
  --> row-local URL decoration --> viewport/selection/control composition
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
| Link construction | At width 40, a wrapped bare URL gained a truncated first-row target and an unlinked continuation; a prelinked file label retained its complete target on both rows. | Reproduced target-boundary defect, not proof of the ghost's native cause. |
| Terminal transformation | 240 generated pinned-shaped frame transitions matched original-write replay for cell text, colors, underline attributes, and cursor. | Limited negative evidence against content loss in those tested transformations. Does not exercise Windows Terminal hover, every grammar, overlays, images, or resize. |

The screenshot `links underlines.png` shows decoration beneath unrelated replacement text; `no such problem with files links.png` supplies the file-link comparison. Neither identifies the exact runtime build or distinguishes stale OSC 8 metadata, SGR state, and host URL detection. Do not embed private session payloads or copy the screenshots into the repository by default.

The planning base is `fa29f8bd`. The implicated paths are unchanged except an unrelated editor-body geometry adjustment. Preserve it and any subsequently integrated modal/selection refinements when implementing.

## Goals / Non-Goals

**Goals:**

- Make execution state, semantic transcript membership, renderer data, and presentation dirtiness separate authorities with explicit lifetimes.
- Keep source identity and content stable while permitting bounded presentation coalescing and legitimate Markdown reflow.
- Reuse complete-target native hyperlink rendering for file and URL content; keep damage decisions downstream of semantic rendering.
- Produce evidence that locates the first failing boundary instead of inferring semantic correctness from a final screenshot.

**Non-Goals:**

- Retaining every token or tool-progress snapshot forever, expanding collapsed tools, revealing deliberately hidden thinking, or overriding existing branch/compaction history policy.
- A new terminal runtime, a general ANSI semantic parser, a dependency upgrade, installed-package changes, private-field access, or prototype patches.
- Replacing native link activation/hover with an A1-owned click or underline system, changing labels to hide URLs, or modifying terminal settings. Such a strategy requires a separately approved design revision if native-link acceptance proves unattainable.
- Tuning frame rate to conceal missing content, globally disabling caches, or increasing event capacity to mask lifecycle defects.

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

### 5. Construct complete link identity before width-dependent layout

`nativeTranscriptLinkColor` already distinguishes web blue from file accent. The repair is to move bare HTTP/HTTPS target recognition to the owned text/span input before wrapping or splitting styles, then carry the complete target through rendering as the existing explicit-file-link path does. Final visible-row inspection continues to measure geometry and cleanup risk; it must not reconstruct a semantic target from row fragments.

Use one owned pre-layout link decoration policy for supported transcript text paths: submitted text, assistant Markdown, and built-in/generic tool text. Preserve Markdown labels and pre-existing OSC 8 targets rather than recognizing nested URLs inside them. Preserve supported trailing-punctuation rules, repeated occurrence identity, Unicode display bounds, and semantic source/copy text. Explicit links emitted by extension components retain their authoritative targets; an opaque row-only renderer does not license guessing a longer hidden target. Provide the same complete-target path at the owned renderer boundary when source text is available.

At the Pi component boundary, use documented renderer injection/public components to place this transform before text wrapping. Where a built-in renderer strips ANSI before constructing its text component, inserting OSC 8 into raw tool output would be ineffective: keep sanitization first and adapt the minimum coherent, attributed text-renderer closure needed to apply link spans afterward but before layout. Do not port the entire fullscreen renderer, inspect private children, or patch shared Text/Markdown prototypes. Conformance and independent rows must show that this limited adaptation leaves non-link styles and spacing unchanged.

Ordinary idle labels and native activation stay unchanged. The existing held-selection paint remains transient and separate from semantic copy; this change does not extend detector-breaking characters into normal source text. A file/URL color-only adjustment or another post-wrap regex is not an implementation of this decision.

### 6. Repair explicit presented-link transitions without reinstating candidate-driven screen clears

Retain the owned damage adapter and its finite pinned grammar. Reconcile exact previously presented and desired explicit-link occurrences at the publication boundary, including moves/removals not accompanied by an observed hover. Treat obsolete explicit occurrences as discarded presented link state with bounded dirty rows; distinguish them from changes to arbitrary dotted/path-like candidate text. Candidate-only streaming must not regain the broad signature-driven cleanup removed by `eliminate-code-block-streaming-flicker`.

Combine required old-link row cleanup and current changed rows in the same synchronized transaction. Acknowledge only the cleanup actually forwarded, keep newer pending intent across coalescing, and preserve a full current recovery when unknown paint makes cached rows non-authoritative. Do not manufacture a full-screen clear for ordinary streaming. Keep explicit-link movement fail-closed: unifying link construction does not itself prove regional scrolling safe for OSC 8 state. Safe link-free/candidate-only shifts and stable dock typing remain optimized.

Record SGR underline and OSC 8 closure separately from host-only URL detection. If a physically reproduced native decoration needs a different bounded overwrite sequence, establish that with captured bytes and exact-host review before selecting it; do not infer success from a render request or headless cells. If no compliant native-link cleanup resolves the original case, stop acceptance and request a revised strategy rather than silently changing link semantics.

Alternative rejected: unconditional force render/full clear on every URL or pointer report. It recreates flashing and still does not prove host-hover invalidation. Alternative rejected: assume that correctly closed OSC 8 sequences exclude a separate native auto-detection defect.

### 7. Test the pipeline with source-faithful events and real renderers

Turn the read-only probes into failing deterministic regressions before changing production code. Use production ordering, multiple assistant messages, serial and parallel tools, real result details, existing history, and delayed settlement. Test final result restatement, stale partial delivery, same-session reconciliation, and actual generation changes. For asynchronous renderers, assert not only the callback but the root's next rows and terminal output, including off-screen invalidation and replacement/disposal races.

Extend the existing evidence harness instead of treating simplified `Text` output as a pinned tool oracle. Run independent actual tool components or the untouched pinned process with equivalent deterministic inputs. Keep both explicitly stepped diagnostic cases and ordinary scheduled/burst cases without a `renderNow()` after every event. The former locates a bad transition; the latter proves it is not hidden by the harness's artificial paint boundaries.

Record bounded correlations between source event/invocation IDs, semantic revision, presentation revision, document/visible range, write-local damage decision, emitted writes, and checked cells. Use isolated public/example targets and synthetic tool data by default; bound and sanitize diagnostics and do not print telemetry into normal transcript/status output. Add negative controls that deliberately reintroduce rejected live output, run-local replacement, discarded details, stale row caches, and truncated URL targets so each gate proves it can fail.

Physical review covers URL/file links and missing blocks together, on the exact built artifact at representative sizes including 192 by 54 and a narrow wrapping size. Record whether a missing surface is assistant text, thinking, code, live tool output, or an edit diff; compare source/session content, desired rows, and physical cells before declaring the cause. Both correctness and original-symptom acceptance must pass.

## Risks / Trade-offs

- [More faithful payloads increase retained data] -> Preserve existing queue/asset limits, keep diagnostic summaries separate, retain newest state by identity, and test large partial/final results without per-chunk serialization or silent loss.
- [A semantic-finality repair lets old updates revive results] -> Test execution-specific barriers, repeated declarations, monotonic revisions, and component/session generations at both engine and shell boundaries.
- [New presentation callbacks create render loops or invalidate everything] -> Coalesce dirty notices by mounted block, retain separate semantic/presentation revisions, and measure unchanged-block reuse and off-screen work.
- [A preview completes after a final authoritative diff] -> Prefer final result data and reject obsolete preview/instance callbacks so stale filesystem-derived state cannot overwrite the result.
- [Pre-layout link adaptation changes non-link rendering] -> Keep the source-derived closure minimal, use public renderer injection, preserve sanitization, and compare exact independent styled rows for built-in and extension cases.
- [Correct terminal cells still leave a Windows Terminal ghost] -> Require host/version-specific reproduction and acceptance; keep the native strategy unaccepted if it fails rather than broadening scope silently.
- [Other active changes touch selection, modal input, or damage metadata] -> Re-read the current integration base and keep their ownership and bounded scheduling contracts; do not reset their artifacts or acceptance claims in this planning change.

## Migration Plan

1. Establish source-faithful failing evidence and record the physical baseline, distinguishing unreproduced host cases.
2. Repair execution phase handling and run-local reconciliation before changing link paint so content-level improvements can be attributed independently.
3. Preserve renderer payloads and wire presentation revision/invalidation through the caches and real scheduler.
4. Move bare-URL target construction before wrapping, then validate bounded cleanup of discarded presented occurrences against the physical reproduction.
5. Run the focused correctness, scheduling, parity, and paint evidence; retain CI and user-controlled exact-artifact acceptance as separate gates.

No persisted session-format or settings migration is needed. Rollback uses the isolated implementation commits and restores existing contract adapters without rewriting session files. If native-link acceptance fails, retain the evidence and the unaccepted implementation for diagnosis; a partial pass does not mark the whole change complete.

## Open Questions

- Which exact installed/build artifact, Windows Terminal version, geometry, and URL-detection settings produced the supplied screenshots? Record during baseline reproduction, without requiring a settings change.
- Which category of generated content vanished in the reported session, and did resizing/reopening restore it? This selects the physical reproduction cases among the already scoped semantic and presentation failures; it does not gate the confirmed regressions.
