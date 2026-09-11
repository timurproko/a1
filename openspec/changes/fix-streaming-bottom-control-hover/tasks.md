## 1. Preserve the Failure and Establish Separate Evidence Cases

- [x] 1.1 Reproduce the editor-then-hover race on the implementation base with an overflowing 60-by-16 owned shell; retain a deterministic regression that fails on the first composed frame for both hover entry and exit before the fix, and record the tested revision rather than treating the exploratory installed-release probe as a CI result.
- [x] 1.2 Add the corresponding runtime-input scheduling fixture with initial setup rendered only once; verify it inspects the first emitted terminal presentation without an extra `root.render` or `renderNow`, fails on stale background styling, and also checks the newest editor cells.
- [ ] 1.3 Define a separate wheel-and-hover streaming workload containing no editor input; verify its event manifest covers assistant and tool updates, spinner overlap, hover entry/exit, stationary hide/reveal, and a no-stream control, and reports its result independently of the cache-race case.

## 2. Make Dock Reuse and Frame Provenance Current

- [ ] 2.1 Revalidate dock-only reuse against the controller's current interaction and selection revisions at composition time; verify the first-frame entry/exit regressions pass without a forced repaint or corrective render.
- [ ] 2.2 Revalidate existing document, transient, geometry, and input-ownership inputs using stable identities or scoped revisions rather than saved-versus-saved references or freshly concatenated row arrays; verify same-height content changes after keyboard receipt are reflected while unchanged typing still takes the dock-only path.
- [ ] 2.3 Publish viewport provenance that matches the rows and hit regions actually composed or validly reused; verify a second keyboard frame cannot perpetuate obsolete hover or content under a newer revision and a supported input-during-composition callback remains eligible for the next frame without a render loop.
- [ ] 2.4 Cover keyboard-then-wheel reveal/hide, return to following, pointer-state reset, multiple pointer reports before composition, reverse ordering, and geometry/new-message-label changes; verify first-frame visibility, current hit regions, newest hover, ordered scrolling, and unchanged control activation semantics in focused shell/controller tests.

## 3. Verify Terminal Paint and Diagnose the Scroll-Only Report

- [ ] 3.1 Replay scheduled terminal writes with a deterministic truecolor theme and assert the normal or pointed-at background at fixture control bounds, plus current editor/content cells; verify stale-first-frame-then-repair and later stale-frame regressions fail even when label text and click behavior are correct.
- [ ] 3.2 Run the independent no-editor streaming workload at 60-by-16 and 192-by-54 geometries; verify first input-paint checkpoints while the stream remains active, detached-position preservation, stationary hide/reveal, and absence of hover regression on pending-stream flush or completion.
- [ ] 3.3 Add bounded test-only or explicitly opt-in owned-boundary diagnostic capture for mouse receipt/routing, event order, candidate/current/composed revisions, control bounds, reuse decisions, and control-cell paint; verify correlation, explicit event limits and truncation, disabled-by-default behavior, and exclusion of keyboard payloads, credentials, link targets, and real conversation text.
- [ ] 3.4 Classify the scroll-only evidence as received-report/stale-composition, correct-composition/incorrect-paint, missing-report observation, physical-only discrepancy, or inconclusive; verify the delivered report cites captured checkpoints and does not infer resolution from the separate cache-race result. If an additional cause falls outside the agreed reuse/presentation scope, document it and request a separate plan rather than implementing a speculative fix here.
- [ ] 3.5 Exercise the existing terminal-replay synchronization interpretations where supported and retain existing damage budgets; verify isolated hover with stable content and no link transition does not clear the screen, force all transcript rows to repaint, or add a hover timer, while wheel and hyperlink-cleanup damage remains separately classified.

## 4. Preserve Compatibility and Bounded Work

- [ ] 4.1 Extend the settled-typing controls for short and long transcripts; verify same-height typing still reuses the viewport, does not rerender settled blocks, and confines paint to changed dock/cursor rows, including immediately after a valid hover frame.
- [ ] 4.2 Run or extend focused stationary-hover, selection/copy, outside-press, scrollbar, sticky-prompt, modal/replacement ownership, hyperlink-cleanup, resize, tiny-terminal, reset, and teardown cases; verify current hit regions, transient-tail layout, pointer clearing, and terminal restoration remain correct.
- [ ] 4.3 Verify the scoped implementation leaves `a1 pi`, untouched Pi, and installed package files unchanged using the applicable comparison and boundary checks; retain the change-specific CI result and focused regression results without claiming completion of the broader rendering-stability matrix.

## 5. Exact-Artifact Acceptance and Handoff

- [ ] 5.1 Deliver the exact candidate identity, focused evidence commands, build and color-preserving interactive launch instructions, and explicit sequences for editor-then-hover and streaming scroll-only hover; verify the handoff describes first-frame expectations, absence of unnecessary repaint, and any inconclusive diagnostic result.
- [ ] 5.2 Obtain physical results for sustained output, wheel-only detachment, entry/exit, stationary hide/reveal, and interleaved editor activity on the exact candidate; record terminal/version, geometry, theme/color mode, viewport settings, click behavior during any miss, and whether moving away and back restores hover, with separate verdicts for both reported cases.
- [ ] 5.3 Record acceptance only after the required checks and user-controlled verdict support it; verify a persistent or unassessed scroll-only symptom remains explicitly unresolved, no complete-fix claim is made, and any narrowing or split of remaining work has separate maintainer approval before completion/archive.
