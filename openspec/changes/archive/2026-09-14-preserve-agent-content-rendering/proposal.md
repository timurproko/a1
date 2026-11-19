## Why

Disappearing or unnecessarily flashing agent blocks are a high-priority usability failure: content presentation must be as close to vanilla pinned Pi as possible, outside documented A1 differences. Investigation confirmed independent tool-lifecycle, transcript-reconciliation, renderer-payload, and cache-invalidation defects; fixing these must not wait for the separate native-link ghost investigation in [issue #353](https://github.com/timurproko/a1/issues/353).

## What Changes

- Separate completion of generated tool arguments from completion of the tool execution, so valid execution-start and accumulated-output updates remain visible while genuinely obsolete updates remain rejected.
- Preserve every displayable semantic block and its identity through message completion, run completion, settlement, and coalesced delivery. A run-local message list must not temporarily replace the complete session transcript.
- Preserve structured tool-rendering results, including diff metadata and supported attachment references, instead of passing renderers a text-only reconstruction or diagnostic summary.
- Make asynchronous renderer invalidation reach the real presentation scheduler and invalidate affected block/document caches independently of semantic block revision. Retain bounded streaming and stable-row reuse.
- Prefer pinned Pi's actual content components and rendering contracts over A1-authored approximations. Refactor proven redundant or faulty rendering paths without removing unrelated A1 features, useful caching, or bounded scheduling.
- Require stable content composition through streaming, completion, asynchronous refresh, and input preemption. Do not conceal omissions or flashing with ordinary-streaming full-screen clears, separate blank frames, or delayed live output.
- Add production-ordered lifecycle, real-renderer parity, scheduling, and terminal-write evidence, followed by user-controlled exact-candidate review of disappearing/flashing blocks. Content correctness and perceptual stability remain acceptance gates.
- Move complete-target wrapped-link repair and native ghost cleanup to issue #353. Preserve existing link colors, labels, activation, selection/copy, and movement safety in this content stream; neither closing this change nor passing cell replay declares the link defects fixed.

“Preserve every block” means keeping displayable assistant/thinking content and tool surfaces available in the active transcript under existing visibility, expansion, scrolling, and session policies. It does not require persisting every superseded token/partial-output snapshot, expanding every tool, or making off-screen content simultaneously visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Strengthen tool lifecycle and transcript continuity, renderer payload fidelity, presentation invalidation, and pinned-content parity; refine streaming coalescing so payload preservation and rejection of truly stale updates remain compatible.
- `custom-session-viewport`: Require stable, current content at presentation boundaries and exact-candidate content acceptance independent of the separately tracked native-link defects.

## Impact

- Expected implementation boundaries: `src/integrations/pi/engine/adapter.ts`, `pending-delivery.ts`, owned transcript/event contracts, `src/integrations/pi/components/shell-presenters-transcript.ts`, component presentation ports, `src/integrations/pi/session-ui/session-shell-root.ts`, shell scheduling, and dependent viewport geometry. Inspect terminal writes to locate content faults; link recognition, hover policy, and host-cleanup experiments are not part of this stream. Any necessary source-derived content-renderer adaptation stays minimal and attributed inside the Pi component integration.
- Extend existing engine, component, viewport, and terminal-evidence tests with real tool ordering, multiple messages/tools, asynchronous invalidation, structured results, attachments, and physical content reproduction. This standalone planning revision adds no code, tests, scripts, or generated baselines and does not import local implementation checkmarks.
- No dependency upgrade, session-format migration, terminal-settings requirement, new link-opening policy, or replacement of Pi's renderer/runtime is proposed. Owned-shell corrections restore pinned content behavior; the explicit `a1 pi` oracle and installed dependencies remain untouched.
- Builds on `recover-history-and-bound-ui-events`, `stabilize-streaming-rendering`, and `eliminate-code-block-streaming-flicker`: preserves bounded delivery/paint constraints and clarifies argument versus execution finality. Existing editor, modal-content interaction, selection, and link safeguards remain intact. Issue #353 carries the deferred link scope and physical findings alongside `fix-ghost-link-underlines`; this amendment does not waive or mark complete that separate work.
- Initial investigation used `c3bf0d2d`; specification PR #348 was accepted from planning base `fa29f8bd`. This user-approved content-first revision is based on `origin/develop` at `33465f56`; preserve intervening prompt/editor and interaction changes when integrating the existing isolated implementation. The original content screenshots' exact runtime build and content category still need identification; this does not block repairs of confirmed agent-content defects.
