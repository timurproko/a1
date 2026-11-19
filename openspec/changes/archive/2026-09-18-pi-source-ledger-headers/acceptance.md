# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `node scripts/pi/update-pinned-pi-source-ledger.mjs --check` reports the ledger and all 26 headers current, and a run after a hand reclassification of a record keeps that record's reviewed fields.
- Every file under `src/integrations/pi/components/upstream/` that is a source file starts with the canonical header for its ledger record, and `check-pinned-pi-source-ledger.mjs` fails when one drifts.
- The repository-governance and Pi component suites pass with the ledger's owned-presentation count corrected from 30 to 27.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-source-ledger-headers",
  "sourcePr": 487,
  "archive": "openspec/changes/archive/2026-09-18-pi-source-ledger-headers/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-pi-source-ledger-headers/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "216b0e90a11f88923b6b1240836ec5ab0db93d1f",
  "acceptanceScenarios": [
    "`node scripts/pi/update-pinned-pi-source-ledger.mjs --check` reports the ledger and all 26 headers current, and a run after a hand reclassification of a record keeps that record's reviewed fields.",
    "Every file under `src/integrations/pi/components/upstream/` that is a source file starts with the canonical header for its ledger record, and `check-pinned-pi-source-ledger.mjs` fails when one drifts.",
    "The repository-governance and Pi component suites pass with the ledger's owned-presentation count corrected from 30 to 27."
  ],
  "archiveDigest": "b7f363e59eeddca6d755f922e203aa2644a788b1f304f20755eec43fc1d25566",
  "specDigest": "b8131086f0caba31fd62811c73623dc4e8b5ed248ef81da24e52914719e8196e",
  "tasksDigest": "1133ca29e40c1eabd9bad62c1fac7db3514f58b2585e197415f92e7988d18805",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
