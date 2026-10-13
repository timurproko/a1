# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Custom themes accept Pi 1.2 schema and export metadata while unsupported fields and colors remain rejected.
- Focused editor cursors use Pi TUI's public marker-based renderer without changing atomic chip navigation.
- A1 follows Pi 1.2 behavior for per-key OpenRouter metadata, remote clipboard delivery, codemode timing, and extension-triggered run setup.
- The feature matrix has no pending rows, inventories have no orphaned or unmapped entries, and the source ledger verifies 131 records across 29 behaviors.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-2-0",
  "sourcePr": 764,
  "archive": "openspec/changes/archive/2026-10-13-pi-upgrade-1-2-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-13-pi-upgrade-1-2-0/acceptance.md",
  "finalizedDate": "2026-10-13",
  "specBaseSha": "a3fe7d0170525f8f3d105b28bf15ca1601fbec1f",
  "acceptanceScenarios": [
    "Custom themes accept Pi 1.2 schema and export metadata while unsupported fields and colors remain rejected.",
    "Focused editor cursors use Pi TUI's public marker-based renderer without changing atomic chip navigation.",
    "A1 follows Pi 1.2 behavior for per-key OpenRouter metadata, remote clipboard delivery, codemode timing, and extension-triggered run setup.",
    "The feature matrix has no pending rows, inventories have no orphaned or unmapped entries, and the source ledger verifies 131 records across 29 behaviors."
  ],
  "archiveDigest": "1befbe0938d9e3d8c0ea912522d3873ea9a8810f964de6ed997224a962225549",
  "specDigest": "4ed2d00027865b9f79e13a38d227f15719ab91dd0e4c40f6022bc896cff48138",
  "tasksDigest": "1e7c46430eff2691e31db1a8e53a2ff49171be06401ae845641de5929bf1b1e4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
