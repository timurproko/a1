# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run check:architecture` passes on the 0.85.1 pin with the ledger, inventories, and startup baselines current, and `npx openspec validate pi-upgrade-0-85-1` passes.
- The command-outcome parity, static component parity, event-frame parity, theme parity, settings inventory, and workflow suites pass against pinned 0.85.1 with the new thinking route and settings.
- The owned settings screen edits per-model thinking levels and fullscreen copy-on-select through the same port the pinned selector uses; the models-selector, trust, and share surfaces match pinned rows.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-85-1",
  "sourcePr": 493,
  "archive": "openspec/changes/archive/2026-09-18-pi-upgrade-0-85-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-pi-upgrade-0-85-1/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "cf7c4145d51a357e1c16897d9146d1135c542528",
  "acceptanceScenarios": [
    "`npm run check:architecture` passes on the 0.85.1 pin with the ledger, inventories, and startup baselines current, and `npx openspec validate pi-upgrade-0-85-1` passes.",
    "The command-outcome parity, static component parity, event-frame parity, theme parity, settings inventory, and workflow suites pass against pinned 0.85.1 with the new thinking route and settings.",
    "The owned settings screen edits per-model thinking levels and fullscreen copy-on-select through the same port the pinned selector uses; the models-selector, trust, and share surfaces match pinned rows."
  ],
  "archiveDigest": "23dfde5aa1d3f588ffaef6f8375cbddc90b08089d89f616edd1c98da21658efc",
  "specDigest": "4d33187d98cd1e4af1bbf7e4d82f62d16680bf71d9d7ba224e60a8302e54366d",
  "tasksDigest": "40cb215ee4ebab0a240d6240a4fb3e9e6f107c42368a62a5db4fc2b63ab788df",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
