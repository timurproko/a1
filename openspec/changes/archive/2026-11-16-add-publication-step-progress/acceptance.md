# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Running publication jobs display current/total workflow-step positions and refresh independently as steps advance.
- Successful jobs show total/total, failed jobs retain their failure label, and skipped jobs omit counters.
- Unavailable step metadata leaves readable status-only output, and unchanged snapshots emit no duplicate progress.
- Interactive rows retain counters when space permits without wrapping, while redirected output remains readable and append-only.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-publication-step-progress",
  "sourcePr": 951,
  "archive": "openspec/changes/archive/2026-11-16-add-publication-step-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-add-publication-step-progress/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "e449cc683579e67e225af4db71a434044f985276",
  "acceptanceScenarios": [
    "Running publication jobs display current/total workflow-step positions and refresh independently as steps advance.",
    "Successful jobs show total/total, failed jobs retain their failure label, and skipped jobs omit counters.",
    "Unavailable step metadata leaves readable status-only output, and unchanged snapshots emit no duplicate progress.",
    "Interactive rows retain counters when space permits without wrapping, while redirected output remains readable and append-only."
  ],
  "archiveDigest": "346f1cc17c0da52b1d4af23dd1031519798f7721e314d6d438818ce789066091",
  "specDigest": "12f4fe960b67ae3e049a70a04a3c962e161704f58096723ed7891a1b05352900",
  "tasksDigest": "dfaa51e1b38b28f8776683937cf71b6261eab14bd0346d314add6cdcb5ff9da0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
