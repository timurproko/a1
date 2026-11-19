# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Release and Full regression builds prepare and verify Rust before building, while prerequisite failures retain their distinct actionable diagnostics.
- The bare thinking selector renders owned semantic colors consistently in dark and light themes across truecolor and 256-color modes, without changing the pinned comparison profile.
- The update-CLI fixture compiles the same isolated full project with the pinned native compiler while preserving its assertions and deadlines.
- The completed repair passes the cross-platform regression lanes that previously exposed the selector, prerequisite, and Windows fixture failures.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-22",
  "sourcePr": 536,
  "archive": "openspec/changes/archive/2026-09-22-fix-nightly-regression-2026-09-22/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-fix-nightly-regression-2026-09-22/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "7b80f6a30cf82ae654a668fc577734bdd33dcaa5",
  "acceptanceScenarios": [
    "Release and Full regression builds prepare and verify Rust before building, while prerequisite failures retain their distinct actionable diagnostics.",
    "The bare thinking selector renders owned semantic colors consistently in dark and light themes across truecolor and 256-color modes, without changing the pinned comparison profile.",
    "The update-CLI fixture compiles the same isolated full project with the pinned native compiler while preserving its assertions and deadlines.",
    "The completed repair passes the cross-platform regression lanes that previously exposed the selector, prerequisite, and Windows fixture failures."
  ],
  "archiveDigest": "da2cad2f954348c2d299bba4ee44ef7719403a59649884f5b102e77426344a9e",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "87f816221031c0e5943d402f095bd9766366a7afa747129b789eac70e6805123",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
