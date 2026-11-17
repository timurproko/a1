# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A completed draft containing current develop becomes ready even when GitHub reports an older PR base SHA.
- A completed draft missing current develop remains draft with a visible stale-target blocker.
- A candidate or target changing during inspection prevents promotion without rewriting the branch or body.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-draft-readiness-stale-base",
  "sourcePr": 966,
  "archive": "openspec/changes/archive/2026-11-17-fix-draft-readiness-stale-base/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-fix-draft-readiness-stale-base/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "21d3f6062fb0eec93b239b9f1f0f88bcc90c0c5e",
  "acceptanceScenarios": [
    "A completed draft containing current develop becomes ready even when GitHub reports an older PR base SHA.",
    "A completed draft missing current develop remains draft with a visible stale-target blocker.",
    "A candidate or target changing during inspection prevents promotion without rewriting the branch or body."
  ],
  "archiveDigest": "60deac5755824d8238276b9105ea682cc5caba0585ce004b6f0254a6b1f34242",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "7c7d331f4c1b061b834241f145443d458e992731cd1c638752edce904154e4aa",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
