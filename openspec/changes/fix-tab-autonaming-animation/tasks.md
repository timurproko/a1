# Tasks

## 1. Prompt auto-naming

- [ ] 1.1 Replace the fixed 64-token attempts with strictly increasing v2-compatible bounded budgets and verify focused auto-name tests cover successful output, answerless first attempts, retry escalation, timeout/failure fallback, normalization, and budget bounds.
- [ ] 1.2 Launch naming from the first valid `agent-run-started` event, revalidate default-name ownership before applying the result, and verify composition tests cover a long-running first turn, one attempt per tab, disabled/missing-input paths, and a manual rename that completes during generation.

## 2. Native title transition

- [ ] 2.1 Implement deterministic native frames for v2's clipped, stable-width per-character rainbow, typewriter, settle-to-gray, and plain non-truecolor phases; verify Rust unit tests cover exact boundaries, color progression, Unicode width, clipping, and completion.
- [ ] 2.2 Preserve an active transition across unchanged tab-list refreshes, start it only for an actual automatic rename, and keep manual/default renames immediate; verify attach/strip tests cover automatic-source detection, refresh continuity, manual suppression, and unchanged hit geometry.

## 3. Integrated evidence

- [ ] 3.1 Run the focused TypeScript and native terminal-host checks plus strict OpenSpec validation, record the results in `evidence/validation.md`, and confirm the implementation has no undispositioned known gaps.
