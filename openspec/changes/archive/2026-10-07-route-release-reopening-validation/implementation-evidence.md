## Implementation

- Exact-base readiness policy reuses `classifyReleaseReopening` against current GitHub PR, file, content, and Release evidence, and binds the result to the event PR number, base SHA, and head SHA.
- `Development validation` records a fixed lightweight change surface for a verified reopening and does not check out the head, install dependencies, run generic impact selection, or schedule naming, documentation, modular, rendering, acceptance, or delivery lanes.
- The protected aggregate accepts those skips only with the explicit exact-head `release-reopening` route; stale heads, missing route output, generic-route overlap, and unexpected lane execution fail.
- Ordinary documentation, version-only, implementation-bound, code, rendering, manual-dispatch, and PR Full regression routes retain their existing selection behavior.

## Automated Evidence

- Focused readiness, aggregate, workflow, and release-reopening policy run: 4 files and 70 tests passed.
- Repository-governance run: 137 files and 1,475 tests passed; the sole initial failure required the generated `dist/` startup artifact. After `npm run build`, the startup-descriptor file passed both tests.
- `npm run build`, `npm run typecheck`, `npm run check:code-documentation`, and `npm run check:repository-governance` passed.
- Strict OpenSpec validation passed for `route-release-reopening-validation`.

## Known Gaps

None. The first post-merge generated reopening will provide live workflow confirmation; trusted documentation auto-merge independently re-verifies the current candidate before integration.
