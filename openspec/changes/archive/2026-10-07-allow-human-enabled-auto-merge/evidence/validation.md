# Validation evidence

## Provenance behavior

- The shared version-3 decision accepts direct manual integration, an authorized human enable followed by disable and manual integration, and an authorized human-owned active native auto-merge arm created after the final committed head.
- Focused fixtures reject stale-head, later-disabled active, mismatched-human, Bot, App, merge-queue, malformed, insufficient-permission, and wrong-target cases. Legacy acceptance PRs remain manual-only.
- Documentation automation preserves a verified human-owned finalized implementation arm without issuing enable or merge mutations. Existing documentation and release-reopening behavior remains covered by the complete manager suite.

## Historical revalidation

Command:

```text
GH_TOKEN="$(gh auth token)" node scripts/governance/reconcile-openspec-archive.mjs --dry-run --pr 709
```

Observed result:

```json
{
  "pr": 709,
  "disposition": "accepted-and-archived",
  "accepted": true,
  "deliveryVersion": 3,
  "change": "fix-resume-selection-style",
  "phase": "Archived",
  "mergeCommit": "bddc4050d8efbe98e668d73fa1b371dbeff62558",
  "archive": "openspec/changes/archive/2026-10-07-fix-resume-selection-style/",
  "validationRunId": 37664559170
}
```

The dry run performed no PR, archive, manifest, branch, or `develop` mutation.

## Automated checks

- Focused governance suites: 170/170 tests passed across acceptance policy/readers, version-3 delivery, documentation auto-merge, delivery guidance, generated manifest wording, and archive workflow.
- `npx tsgo -p tsconfig.json --noEmit`: passed.
- `npm run check:architecture`: passed all architecture, identity, pinned-source, and terminal-host checks.
- `npm run check:code-documentation:changed`: passed.
- `npm run check:docs-governance`: passed.
- `npx openspec validate allow-human-enabled-auto-merge --type change --strict --no-interactive`: passed.
- `git diff --check` and syntax checks for changed governance modules: passed.

## Known gaps and bootstrap constraint

This is governance-only behavior with no interactive product surface, so no runtime UI test applies. A local full package build could not complete because the shared primary-checkout Pi dependency produced a startup artifact of 9,920,811 bytes against the existing 9,908,313-byte baseline; the resulting missing generated startup descriptor also prevented the bin-only half of `npm run typecheck`. The changed TypeScript/declaration surface passed `tsconfig.json`, focused tests, syntax checks, and documentation governance. No baseline or unrelated generated output was changed.

This policy PR must still be manually merged under the currently deployed manual-only rule. PR #709 cleanup is not claimed here and must run only after this policy is integrated into `develop` and the shared reader re-verifies #709 from that deployed revision.
