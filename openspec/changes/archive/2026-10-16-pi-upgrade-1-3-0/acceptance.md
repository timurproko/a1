# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 pins Pi 1.3.0 at upstream commit 71023ae, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.
- `/share` follows the Pi 1.3.0 session share destination setting: `auto` uploads to Radius when Radius is signed in and otherwise creates a secret gist, `gist` always creates a gist, and `radius` requires Radius sign-in.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-3-0",
  "sourcePr": 783,
  "archive": "openspec/changes/archive/2026-10-16-pi-upgrade-1-3-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-pi-upgrade-1-3-0/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "1734b91d6d6b1051ee7de51ac2c09a6560b0f440",
  "acceptanceScenarios": [
    "A1 pins Pi 1.3.0 at upstream commit 71023ae, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.",
    "`/share` follows the Pi 1.3.0 session share destination setting: `auto` uploads to Radius when Radius is signed in and otherwise creates a secret gist, `gist` always creates a gist, and `radius` requires Radius sign-in."
  ],
  "archiveDigest": "c853e27c2daf91d0b8c63e08fb1ae08dc5840853111996d0dd37b97c6276bacf",
  "specDigest": "c53288cedb3c14f5d35b94d3866c4756c06339f96aca16b2eed33d988c96f2c7",
  "tasksDigest": "fb0f9cd611bd13d4fb350c130818e0dd525ddc4f1b1fc76c5b25a314591a1550",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
