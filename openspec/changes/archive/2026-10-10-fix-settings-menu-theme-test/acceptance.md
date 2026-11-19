# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- `test/composition/settings-route-host.test.ts` passes on all platforms.
- A pointer-opened Settings menu still starts on the value in effect, and one Down press moves the standard selection background to the next choice.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-settings-menu-theme-test",
  "sourcePr": 752,
  "archive": "openspec/changes/archive/2026-10-10-fix-settings-menu-theme-test/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-fix-settings-menu-theme-test/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "395529ed7bd7f71bbe9bc6735763fab5524a63e0",
  "acceptanceScenarios": [
    "`test/composition/settings-route-host.test.ts` passes on all platforms.",
    "A pointer-opened Settings menu still starts on the value in effect, and one Down press moves the standard selection background to the next choice."
  ],
  "archiveDigest": "b1a3bcdc359d5461eb8adc7d3f41152599075ce9af3f9918aa1136def6fb8cde",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "db4e1cea4b9f936260c1050f97021a304a61d994c18976fec6a3eb59d0a5d79e",
  "evidenceDigest": "e2998d7eabb457da60cfaf6984ea781a3b1d30bfcbaf57846f9132916168a98f",
  "knownGaps": []
}
```
