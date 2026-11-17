# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Develop and valid release commands repair missing, stale or incomplete checkout dependencies before importing publication modules.
- A successful locked npm installation and readiness recheck continue the original command once with its original arguments.
- Healthy dependencies do not trigger reinstallation, and doctor or ordinary builds remain diagnostic-only.
- Failed, interrupted or still-incomplete setup stops before publication and never retries a publication action.
- Concurrent repairs serialize per checkout, while foreign locks and unsafe external dependency links remain protected.
- Invalid release arguments remain mutation-free usage errors, and stable release publication still requires the ordinary human approval.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publication-dependency-bootstrap",
  "sourcePr": 970,
  "archive": "openspec/changes/archive/2026-11-17-publication-dependency-bootstrap/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-publication-dependency-bootstrap/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "73058d664224c916bbfd358855175ad829a67c80",
  "acceptanceScenarios": [
    "Develop and valid release commands repair missing, stale or incomplete checkout dependencies before importing publication modules.",
    "A successful locked npm installation and readiness recheck continue the original command once with its original arguments.",
    "Healthy dependencies do not trigger reinstallation, and doctor or ordinary builds remain diagnostic-only.",
    "Failed, interrupted or still-incomplete setup stops before publication and never retries a publication action.",
    "Concurrent repairs serialize per checkout, while foreign locks and unsafe external dependency links remain protected.",
    "Invalid release arguments remain mutation-free usage errors, and stable release publication still requires the ordinary human approval."
  ],
  "archiveDigest": "0fdde7b6ba9421f8e83a731269e9036a8c21169f5ce1fb3a1d2c371138920ca9",
  "specDigest": "379f83437292b565d9de164e79c828eeeb90266d60d5665612917cd9129928cc",
  "tasksDigest": "f064a5b97e134cb2f1e3dd959b3d94a9e515fabc2b548175a2937ce5c14993d5",
  "evidenceDigest": "7a7605f31658f34014a212a4674e78c55a09be2cd51515ee34ec6bb1f00355e3",
  "knownGaps": []
}
```
