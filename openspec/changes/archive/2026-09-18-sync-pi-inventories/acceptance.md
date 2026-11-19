# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `node scripts/pi/sync-pi-inventories.mjs --check` reports the inventories current for 0.84.2 and the three inventory governance suites pass unchanged.
- Against synthetic sources, matching anchors and ranges stay byte-identical, a whitespace-shifted anchor is rewritten, a vanished anchor marks its entry orphaned, a shifted behavior moves to its symbol span, and a new component is reported unmapped.
- Orphaned entries and unmapped components fail `--check` rather than being written as accepted.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "sync-pi-inventories",
  "sourcePr": 488,
  "archive": "openspec/changes/archive/2026-09-18-sync-pi-inventories/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-sync-pi-inventories/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "2d202c084951f8218dd9cbf3bc4cd4e58fa5a3c7",
  "acceptanceScenarios": [
    "`node scripts/pi/sync-pi-inventories.mjs --check` reports the inventories current for 0.84.2 and the three inventory governance suites pass unchanged.",
    "Against synthetic sources, matching anchors and ranges stay byte-identical, a whitespace-shifted anchor is rewritten, a vanished anchor marks its entry orphaned, a shifted behavior moves to its symbol span, and a new component is reported unmapped.",
    "Orphaned entries and unmapped components fail `--check` rather than being written as accepted."
  ],
  "archiveDigest": "8cca72409e77c3c2c87f8c450532a34a6c909ea37d7b749add20ba033a53702b",
  "specDigest": "0a9ff402051a91fb58fd76c0a183f4891a51e1ad8feca60e59d347ccdfca3584",
  "tasksDigest": "663214d246494571176790f172dd4e03eca3be045211f8e796ecf0ecf463b966",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
