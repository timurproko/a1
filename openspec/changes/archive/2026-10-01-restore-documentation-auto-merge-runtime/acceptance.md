# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The trusted documentation auto-merge manager loads without `node_modules` and reaches policy input validation instead of failing module resolution.
- Stable release-note validation and newest-first ordering remain exact while rejecting malformed or unsafe numeric versions.
- Release-reopening classification accepts the exact patch successor and continues to reject mismatched branches and content.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-documentation-auto-merge-runtime",
  "sourcePr": 653,
  "archive": "openspec/changes/archive/2026-10-01-restore-documentation-auto-merge-runtime/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-restore-documentation-auto-merge-runtime/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "96c6c4b8d1947d2ed1eb3a8546b663f2b9cc9296",
  "acceptanceScenarios": [
    "The trusted documentation auto-merge manager loads without `node_modules` and reaches policy input validation instead of failing module resolution.",
    "Stable release-note validation and newest-first ordering remain exact while rejecting malformed or unsafe numeric versions.",
    "Release-reopening classification accepts the exact patch successor and continues to reject mismatched branches and content."
  ],
  "archiveDigest": "a39874f4d5e613c2131b2d877cdd4f22fc77a72aa1739425e314772bbc692557",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "c9d39aac3b0622d9caacab45e036f05e4868222e3380d06759af2d93d126137a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
