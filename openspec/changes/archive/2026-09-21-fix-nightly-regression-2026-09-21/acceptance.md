# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Full regression on the fix head passes the update-predecessor owner on the windows-2025 node 22 lane that failed the nightly Release run.
- The predecessor lane reports one discard per released root inside the test phase, and a final cleanup that retained zero roots.
- The test, hook, warmup, and workflow time limits of the published-predecessor gate are unchanged from the failed head.
- Focused predecessor fixture contracts cover the release path, the unowned-path refusal, the active-command refusal, and the retained-root failure.
- Predecessor selection, count, ordering, supported-entry checks, and the minimum exercised-predecessor assertion are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-21",
  "sourcePr": 527,
  "archive": "openspec/changes/archive/2026-09-21-fix-nightly-regression-2026-09-21/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-fix-nightly-regression-2026-09-21/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "ba7947342bd2978ae9f8cdbda0659c7b0e9e3e98",
  "acceptanceScenarios": [
    "Full regression on the fix head passes the update-predecessor owner on the windows-2025 node 22 lane that failed the nightly Release run.",
    "The predecessor lane reports one discard per released root inside the test phase, and a final cleanup that retained zero roots.",
    "The test, hook, warmup, and workflow time limits of the published-predecessor gate are unchanged from the failed head.",
    "Focused predecessor fixture contracts cover the release path, the unowned-path refusal, the active-command refusal, and the retained-root failure.",
    "Predecessor selection, count, ordering, supported-entry checks, and the minimum exercised-predecessor assertion are unchanged."
  ],
  "archiveDigest": "b3ab6c9d1704dae30936639c49325da59acecf92f60816e2e8fe270beabd78b6",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "5286f7d6f4d7ecccaea3c3c8487a070c94fa6f25e7c9c8287c9aa34770ab5766",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
