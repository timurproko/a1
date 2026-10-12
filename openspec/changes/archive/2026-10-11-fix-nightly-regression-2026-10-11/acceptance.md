# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Warm-spare latency is measured only after the helper's protocol readiness while retaining the 500-millisecond budget.
- A real helper still covers both announced and starting spares and replenishes the pool after each paste.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-11",
  "sourcePr": 755,
  "archive": "openspec/changes/archive/2026-10-11-fix-nightly-regression-2026-10-11/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-fix-nightly-regression-2026-10-11/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "2a8be1665aa556cf3ab9c37a5504ca18fafb16a8",
  "acceptanceScenarios": [
    "Warm-spare latency is measured only after the helper's protocol readiness while retaining the 500-millisecond budget.",
    "A real helper still covers both announced and starting spares and replenishes the pool after each paste."
  ],
  "archiveDigest": "eeda44404b35313d0f9c6e8ba88692a21d89354fee935df1846b37f9f057e2ff",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "09dde1300f519b9c5bf28d01ca551d72f8fe205cd0bb1faa9f9be69b06d7ba88",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
