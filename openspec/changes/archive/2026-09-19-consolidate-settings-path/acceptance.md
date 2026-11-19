# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `OwnedSettingsManager.value("scrollbarSpeed")` is typed `"normal" | "fast" | "high"` and never null; the persistence, manager, sections, composition, run, and settings-app suites pass against the merged class.
- `PiSettingsBridge` lists, reads, writes, and rolls back every exposed Pi setting as before; the inventory, coordinator, theme, and project-trust suites pass, and `PI_SETTING_EFFECTS` keeps hidden-in-bare and owner semantics.
- `npm run build` writes the metadata into `dist/`, the test run writes it beside the source, no copy is committed, and typecheck, architecture, documentation, ledger, and inventory checks pass.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "consolidate-settings-path",
  "sourcePr": 500,
  "archive": "openspec/changes/archive/2026-09-19-consolidate-settings-path/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-consolidate-settings-path/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "2bef1e4fe41d35ee3dbca43dc96aff6f4a0df043",
  "acceptanceScenarios": [
    "`OwnedSettingsManager.value(\"scrollbarSpeed\")` is typed `\"normal\" | \"fast\" | \"high\"` and never null; the persistence, manager, sections, composition, run, and settings-app suites pass against the merged class.",
    "`PiSettingsBridge` lists, reads, writes, and rolls back every exposed Pi setting as before; the inventory, coordinator, theme, and project-trust suites pass, and `PI_SETTING_EFFECTS` keeps hidden-in-bare and owner semantics.",
    "`npm run build` writes the metadata into `dist/`, the test run writes it beside the source, no copy is committed, and typecheck, architecture, documentation, ledger, and inventory checks pass."
  ],
  "archiveDigest": "e927e5e5eacedf9cd162bbfd0188692c23ebfc3cd9e0208700aa3e5f08f04cf3",
  "specDigest": "e82bd03456687ae4fcea0caa259b85b5fe7bdc4bf21a259d5ba1310dc010a65e",
  "tasksDigest": "17ffe3cf78ab32c2152bca591d1994ece5ce3eae9109544bd82e1e2a1860a26d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
