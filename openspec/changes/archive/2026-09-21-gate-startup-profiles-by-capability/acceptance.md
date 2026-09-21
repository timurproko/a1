# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A stable candidate measures the a1 profile alone against the unchanged budgets and records three measurements instead of failing.
- A stable candidate proves that a1 pi exits with status 0, writes nothing to stdout or stderr, and paints no input-ready frame.
- A prerelease candidate still measures both profiles and records six measurements on every supported Windows lane.
- A stable publication dispatch reaches the publish step rather than failing in the two Windows validation lanes.
- No product source changes: capabilities, dispatch, and the packed entry already implement the contract the gate contradicted.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "gate-startup-profiles-by-capability",
  "sourcePr": 532,
  "archive": "openspec/changes/archive/2026-09-21-gate-startup-profiles-by-capability/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-gate-startup-profiles-by-capability/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "A stable candidate measures the a1 profile alone against the unchanged budgets and records three measurements instead of failing.",
    "A stable candidate proves that a1 pi exits with status 0, writes nothing to stdout or stderr, and paints no input-ready frame.",
    "A prerelease candidate still measures both profiles and records six measurements on every supported Windows lane.",
    "A stable publication dispatch reaches the publish step rather than failing in the two Windows validation lanes.",
    "No product source changes: capabilities, dispatch, and the packed entry already implement the contract the gate contradicted."
  ],
  "archiveDigest": "290a2f1a7498374a24633becd6120e8b50e92e514ea216e0b6531f648f9cb566",
  "specDigest": "ac2c3e16180279260807ec93e1881cc4bd8a4ef92f8368f6339d76df2396af5c",
  "tasksDigest": "19f2bc1e7926f80dd4920ae4f7a044502d87b30487adf35f436eb753958727a1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
