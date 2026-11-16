# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Running publication jobs show current/total counters even when future workflow steps are pending.
- Advancing one job updates only its row, while unchanged snapshots remain silent.
- Interactive counters update in place and redirected output remains readable without terminal controls.
- Unknown or malformed step metadata still omits counts, and completed jobs retain their outcome labels.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-publication-live-step-counts",
  "sourcePr": 953,
  "archive": "openspec/changes/archive/2026-11-16-fix-publication-live-step-counts/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-fix-publication-live-step-counts/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "26618ed2c5b21c7d48173022136eabc084dc94ba",
  "acceptanceScenarios": [
    "Running publication jobs show current/total counters even when future workflow steps are pending.",
    "Advancing one job updates only its row, while unchanged snapshots remain silent.",
    "Interactive counters update in place and redirected output remains readable without terminal controls.",
    "Unknown or malformed step metadata still omits counts, and completed jobs retain their outcome labels."
  ],
  "archiveDigest": "548b686806fb248a6329a51ef1504bce46e8a89cd657114a5364c8854af3314a",
  "specDigest": "4443641551a5b25d3edabbdd4f9313dd04c2e70cba8b7662ebccfd50abba2426",
  "tasksDigest": "774a85d4ae7dd4b0663d1787d862e368904ccc223f5eca6b41f6cca89850a7d9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
