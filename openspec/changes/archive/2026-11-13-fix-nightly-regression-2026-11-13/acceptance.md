# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-11-13 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-11-13",
  "sourcePr": 920,
  "archive": "openspec/changes/archive/2026-11-13-fix-nightly-regression-2026-11-13/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-13-fix-nightly-regression-2026-11-13/acceptance.md",
  "finalizedDate": "2026-11-13",
  "specBaseSha": "8fb67ffab50aa9da58d5606a264582fc06ac1cc2",
  "acceptanceScenarios": [
    "The 2026-11-13 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "cfb711185482fa9cbf151f8ed9df61815d8b5d96bc35b59963cf712e5fe9c529",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "e07fa3b1a15274f02034aba1f4daf4b432694f8dd9da96665dd8d8bb91b01d62",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
