# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A development publication whose version appears on the registry within ten minutes of `npm publish` verifies and reports success without operator intervention.
- A registry that serves different bytes or a channel tag naming another version still fails the verification on the first attempt that observes it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "wait-for-registry-propagation",
  "sourcePr": 469,
  "archive": "openspec/changes/archive/2026-09-17-wait-for-registry-propagation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-wait-for-registry-propagation/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "15fe3a1858c4de3741fafc007a46d2667e2800cd",
  "acceptanceScenarios": [
    "A development publication whose version appears on the registry within ten minutes of `npm publish` verifies and reports success without operator intervention.",
    "A registry that serves different bytes or a channel tag naming another version still fails the verification on the first attempt that observes it."
  ],
  "archiveDigest": "7f1996d08511a95ea7fd5cf2ecca6c18e67467e55daf0d58577b073391e043f0",
  "specDigest": "a7e451661d685c665a8f2fe7dc17bab67c14a138ffbc154f3e84f3cc812085e2",
  "tasksDigest": "c3060045c4bbb57b66eca9e9290cd6572e5aa8abed3999937a985b08a2b66ace",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
