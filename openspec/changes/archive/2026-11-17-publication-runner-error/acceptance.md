# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A confirmed hosted-runner acquisition failure explains that affected jobs never started and recommends a manual retry instead of a code fix.
- Actual, mixed, unknown or incompletely inspected failures retain conservative guidance without claiming that a retry alone resolves them.
- Failed publication remains unsuccessful, preserves npm staging and registry warnings, and never retries or bypasses validation automatically.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publication-runner-error",
  "sourcePr": 972,
  "archive": "openspec/changes/archive/2026-11-17-publication-runner-error/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-publication-runner-error/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "d23868770309a54e00b17f48146397637c31abec",
  "acceptanceScenarios": [
    "A confirmed hosted-runner acquisition failure explains that affected jobs never started and recommends a manual retry instead of a code fix.",
    "Actual, mixed, unknown or incompletely inspected failures retain conservative guidance without claiming that a retry alone resolves them.",
    "Failed publication remains unsuccessful, preserves npm staging and registry warnings, and never retries or bypasses validation automatically."
  ],
  "archiveDigest": "09c774ef1db8f02794845a1e71376dc3dc0da281f517f1d7da9f2e5ffe197ae1",
  "specDigest": "f52d4a0f78b8cd3a9799e857023e21314a674c72b00c040e9160623341721363",
  "tasksDigest": "495a93193526151d952faba68fe1cbf23259c8858c3a5338bf07e0d8b2393bc7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
