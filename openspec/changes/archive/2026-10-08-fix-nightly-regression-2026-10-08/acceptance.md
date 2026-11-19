# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Linux and macOS now exercise fail-closed inspection for an unapproved disposable-root link instead of returning early as ordinary untracked content.
- Link drift, replacement, cycle, missing-target, and unapproved-root assertions remain unchanged and run from one cross-platform fixture.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-08",
  "sourcePr": 717,
  "archive": "openspec/changes/archive/2026-10-08-fix-nightly-regression-2026-10-08/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-fix-nightly-regression-2026-10-08/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "9bc003bb8ee2448a249bc815f14db22b86d8282a",
  "acceptanceScenarios": [
    "Linux and macOS now exercise fail-closed inspection for an unapproved disposable-root link instead of returning early as ordinary untracked content.",
    "Link drift, replacement, cycle, missing-target, and unapproved-root assertions remain unchanged and run from one cross-platform fixture."
  ],
  "archiveDigest": "5d61cca5efb2b43e84bad5664bb4a996f9f91620ff2f9edb5c91402462810d31",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "a42b60d703fa883fa79910cf01f917229e9d73610bb00dcab20cacd359025bfb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
