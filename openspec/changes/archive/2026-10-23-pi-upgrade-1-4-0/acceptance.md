# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 pins Pi 1.4.0 at upstream commit 4a08025, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-4-0",
  "sourcePr": 810,
  "archive": "openspec/changes/archive/2026-10-23-pi-upgrade-1-4-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-23-pi-upgrade-1-4-0/acceptance.md",
  "finalizedDate": "2026-10-23",
  "specBaseSha": "2fe68ba1866b7122125cb4d217b7618b1e719464",
  "acceptanceScenarios": [
    "A1 pins Pi 1.4.0 at upstream commit 4a08025, and its vendored copies, inventories, public API and feature baselines, and parity records match that release."
  ],
  "archiveDigest": "ef8aa8dee4123e57657e641995ea267dae419489569ecd4e425251a91ddef2b2",
  "specDigest": "f76e47ec1e46226fbb9d3672e2d760d87eee52e5e2711d1024c65166574d6f8a",
  "tasksDigest": "a3e7da37887e869767fd5b7ff089f69bc2ae32b297e20637d95bbbeafc44d4bf",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
