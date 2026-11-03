# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 pins Pi 1.5.0 at upstream commit f9a2636, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-5-0",
  "sourcePr": 859,
  "archive": "openspec/changes/archive/2026-11-03-pi-upgrade-1-5-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-03-pi-upgrade-1-5-0/acceptance.md",
  "finalizedDate": "2026-11-03",
  "specBaseSha": "3eb4c687c944b920974b3ac5105f1136b9485332",
  "acceptanceScenarios": [
    "A1 pins Pi 1.5.0 at upstream commit f9a2636, and its vendored copies, inventories, public API and feature baselines, and parity records match that release."
  ],
  "archiveDigest": "aaa2231055efeb0c08efc25318e7dca9119bbeb1b716978137c1b2fbbe444ed9",
  "specDigest": "3f036ac19a435a9d32f90d0fdddc70b84650a159e1fdb4373d3b785946438331",
  "tasksDigest": "8eef3e19c197066e033c46a251fa337fe04395d70f8237df63429ec37d9a474e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
