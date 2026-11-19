# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare `a1` opens its tabs on a profile that already has a settings document, with no `prepare --settings-file` error.
- Bare `a1` opens its tabs on a profile without a settings document and creates nothing at the settings path.
- The strip clock still follows the time format saved in the settings document.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-attach-settings-file",
  "sourcePr": 797,
  "archive": "openspec/changes/archive/2026-10-17-fix-attach-settings-file/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-fix-attach-settings-file/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "ce3e1b3cf0beeead4d7c6c9372b6483b9fcf7414",
  "acceptanceScenarios": [
    "Bare `a1` opens its tabs on a profile that already has a settings document, with no `prepare --settings-file` error.",
    "Bare `a1` opens its tabs on a profile without a settings document and creates nothing at the settings path.",
    "The strip clock still follows the time format saved in the settings document."
  ],
  "archiveDigest": "5e3fd94ff99a6612c82465958c79652ef7197bf1678ac5443d8c1695f26c892a",
  "specDigest": "444ef864f541b114ce0105e3e119f2a660be1ee8829c79fce7ad45d5d0320d92",
  "tasksDigest": "dfd573a240ef9aa28f171f4acac9d13482514bd68f038637045fb26217485e15",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
