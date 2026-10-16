# Tasks

## 1. Prompt auto-naming

- [x] 1.1 Replace the fixed 64-token attempts with strictly increasing v2-compatible bounded budgets and verify focused auto-name tests cover successful output, answerless first attempts, retry escalation, timeout/failure fallback, normalization, and budget bounds.
- [x] 1.2 Launch naming from the first valid `agent-run-started` event, revalidate default-name ownership before applying the result, and verify composition tests cover a long-running first turn, one attempt per tab, disabled/missing-input paths, and a manual rename that completes during generation.

## 2. Native title transition

- [x] 2.1 Implement deterministic native frames for v2's clipped, stable-width per-character rainbow, typewriter, settle-to-gray, and plain non-truecolor phases, with Rust unit tests for exact boundaries, color progression, Unicode width, clipping, and completion.
- [x] 2.2 Preserve an active transition across unchanged tab-list refreshes, start it only for an actual automatic rename, and keep manual/default renames immediate, with strip tests for automatic-source detection, refresh continuity, manual suppression, and unchanged hit geometry.
