# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A `chore/release-X.Y.Z-dev` PR opened by `openspec-ci[bot]` with only the three version bumps and the note equal to the published Release squash-merges itself after `Development validation required` passes on its current head, and its branch is deleted.
- The same PR with a dependency change, an extra or renamed file, inconsistent versions, another author, or a note that differs from the published Release is not merged, and any armed auto-merge is disabled.
- A PR on any other branch that edits `docs/releases/**` still requires manual merge.
- New reopening PRs say they merge automatically; the finalize summary and release runbook describe auto-merge with a manual fallback.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "auto-merge-release-reopening",
  "sourcePr": 651,
  "archive": "openspec/changes/archive/2026-09-30-auto-merge-release-reopening/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-auto-merge-release-reopening/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "609db218746c2ec95bff9b9412300fce745c0073",
  "acceptanceScenarios": [
    "A `chore/release-X.Y.Z-dev` PR opened by `openspec-ci[bot]` with only the three version bumps and the note equal to the published Release squash-merges itself after `Development validation required` passes on its current head, and its branch is deleted.",
    "The same PR with a dependency change, an extra or renamed file, inconsistent versions, another author, or a note that differs from the published Release is not merged, and any armed auto-merge is disabled.",
    "A PR on any other branch that edits `docs/releases/**` still requires manual merge.",
    "New reopening PRs say they merge automatically; the finalize summary and release runbook describe auto-merge with a manual fallback."
  ],
  "archiveDigest": "cd84ff2bde53c62015ecf20d41df54312ad56512d71e9d84c3e564302ca4c045",
  "specDigest": "26aad5ed61a389095bbd36c7e2835f16ea5033c21dd9c11ed95cc3db9e15f9e8",
  "tasksDigest": "ce7455f56c09f1f3cd2b998ed82c687b9c0d8e922e9c8679348b7cf9624384a7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
