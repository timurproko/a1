# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 pins Pi 1.5.1 at upstream commit dd30101, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-5-1",
  "sourcePr": 898,
  "archive": "openspec/changes/archive/2026-11-10-pi-upgrade-1-5-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-pi-upgrade-1-5-1/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "2ebe07b1cb4b591b5bac2d640d29d6053e7b9556",
  "acceptanceScenarios": [
    "A1 pins Pi 1.5.1 at upstream commit dd30101, and its vendored copies, inventories, public API and feature baselines, and parity records match that release."
  ],
  "archiveDigest": "7d271d7305bdd52f4528cf5b94f1f2b1d781213b62572ec945b4ae00e1cbcd65",
  "specDigest": "de2d52d2ce353b583859c4e9fb1a278c7a5d4ac1b9cf11458756b75770127b56",
  "tasksDigest": "ae0ce79679bb4648782ab942124fb0f3805cccbe06e5e03b66214f4808f3baeb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
