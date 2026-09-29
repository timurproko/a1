# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Preferred A1 installation guidance consistently begins with `npm x` across the root README, published installer README, release runbook, and canonical contract.
- Stable, development, numeric-preview, and exact-preview forms retain the custom installer through an explicit npm/package argument boundary.
- Focused coverage prevents the former `npx` installer guidance from returning while installer runtime behavior remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "use-npm-x-installer-command",
  "sourcePr": 620,
  "archive": "openspec/changes/archive/2026-09-29-use-npm-x-installer-command/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-use-npm-x-installer-command/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "694c8846ba1d96cb7048bde6eba84141d110e523",
  "acceptanceScenarios": [
    "Preferred A1 installation guidance consistently begins with `npm x` across the root README, published installer README, release runbook, and canonical contract.",
    "Stable, development, numeric-preview, and exact-preview forms retain the custom installer through an explicit npm/package argument boundary.",
    "Focused coverage prevents the former `npx` installer guidance from returning while installer runtime behavior remains unchanged."
  ],
  "archiveDigest": "d8ce3cde6f2c1a799d57cfa59451b12eee6e0e62433fa7eab205de1f673cf99b",
  "specDigest": "e3a65e7295b49b29dae17728d2ce94b27ce34f5768797604946e50853f88d539",
  "tasksDigest": "6125fc3af5c290d34d3bd6df481acf9c94ebe8222c25ded8471d7399ffdd1629",
  "evidenceDigest": "9f95d8041f08e469360d634923ccdfd455db33cfaf38e8815e194a9fb5e25929",
  "knownGaps": []
}
```
