# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A manual development publication runs three `Validate` jobs on Windows, Linux, and macOS Node 24, and nightly and stable publication still run the Windows Node 22 lane as well.
- The publication guardian build restores its compiler cache and still performs the locked release build with an unchanged artifact manifest.
- Every exact-package preparation receipt shows install, proxy-synchronization, and installed-identity durations that sum to no more than its recorded total.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "bound-development-publication-matrix",
  "sourcePr": 445,
  "archive": "openspec/changes/archive/2026-09-17-bound-development-publication-matrix/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-bound-development-publication-matrix/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "b7a04300c2bc988ed40d3334e28869c3af81f9d2",
  "acceptanceScenarios": [
    "A manual development publication runs three `Validate` jobs on Windows, Linux, and macOS Node 24, and nightly and stable publication still run the Windows Node 22 lane as well.",
    "The publication guardian build restores its compiler cache and still performs the locked release build with an unchanged artifact manifest.",
    "Every exact-package preparation receipt shows install, proxy-synchronization, and installed-identity durations that sum to no more than its recorded total."
  ],
  "archiveDigest": "fa9286391ed2f2dd490f4cc84091307b275db83cb71d5258164a50795e3ccf23",
  "specDigest": "0493205981791bc4b79adafeef9403dc863637100200c7689bff582e2890b00b",
  "tasksDigest": "0a8f6a085c72030217ba3041f115759d03ab2af31c0ec41b65fad39d03d40336",
  "evidenceDigest": "dce5265b06060da5ed17bfea0042fdba7fe172f0ac536e913f2c66c1d8a2b22c",
  "knownGaps": []
}
```
