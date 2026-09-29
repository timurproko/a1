# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The queued chip wrapping test asserts the exact dequeue hint rows for each platform, including the wrapped Option+Up hint on macOS.
- Every width and rail appearance of the scrollbar gutter selection replay runs as its own case with its original deadline and combinations.
- The pinned Pi public API baseline matches the installed packages on the merged develop head.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-29",
  "sourcePr": 626,
  "archive": "openspec/changes/archive/2026-09-29-fix-nightly-regression-2026-09-29/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-fix-nightly-regression-2026-09-29/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "91b3b19e7cbe1fab48d3b41c97af030f6e367022",
  "acceptanceScenarios": [
    "The queued chip wrapping test asserts the exact dequeue hint rows for each platform, including the wrapped Option+Up hint on macOS.",
    "Every width and rail appearance of the scrollbar gutter selection replay runs as its own case with its original deadline and combinations.",
    "The pinned Pi public API baseline matches the installed packages on the merged develop head."
  ],
  "archiveDigest": "1dff7684067673ecf47ae5d0c850f778f065725755b55f9acb107a4fab53c636",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
