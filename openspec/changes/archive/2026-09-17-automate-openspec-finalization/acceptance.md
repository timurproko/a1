# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Marking an implementation-bound version-3 PR ready produces one `docs(openspec): finalize` commit from the archive App on its branch, an updated implementation fence, and a green exact-head validation run without any local finalization.
- Pushing a fix that edits the archived tasks or evidence yields one `docs(openspec): refinalize` commit under the same archive path instead of a revert, and a head behind `develop` is restored, merged, and re-finalized by the workflow.
- A ready head that still holds the active change fails `Finalized delivery validation` with an `Awaiting automated finalization` notice and stays unmergeable until the workflow's head validates.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "automate-openspec-finalization",
  "sourcePr": 456,
  "archive": "openspec/changes/archive/2026-09-17-automate-openspec-finalization/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-automate-openspec-finalization/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "7ad079752e7041ed7520b2b616a0183f80d0bb1b",
  "acceptanceScenarios": [
    "Marking an implementation-bound version-3 PR ready produces one `docs(openspec): finalize` commit from the archive App on its branch, an updated implementation fence, and a green exact-head validation run without any local finalization.",
    "Pushing a fix that edits the archived tasks or evidence yields one `docs(openspec): refinalize` commit under the same archive path instead of a revert, and a head behind `develop` is restored, merged, and re-finalized by the workflow.",
    "A ready head that still holds the active change fails `Finalized delivery validation` with an `Awaiting automated finalization` notice and stays unmergeable until the workflow's head validates."
  ],
  "archiveDigest": "64e143c9e3c291b935f04b07dde3cfd6691a301c522e7968ecdfd143d93efe98",
  "specDigest": "15a86f75176fbda09ba8552b749bbb517839ba397ec9a24617962621263cc825",
  "tasksDigest": "5e23c522d2b37e4e4bcd0986e97d6b418683acbb137e1a5de3b6fe43adf04f0f",
  "evidenceDigest": "7c3b6095648b2622ceca1783a7da6dc008899c9a4df698f493d3bf09016c817f",
  "knownGaps": []
}
```
