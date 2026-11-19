# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A development publication lists its skipped Windows jobs as `Validate Windows shard` and `Reconstruct Windows lane` instead of raw `${{ matrix.* }}` templates.
- Running publication lanes still identify their platform, Node version, and shard through GitHub's automatic matrix suffix.
- Publication job ids, conditions, matrices, and the aggregate outcome are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "readable-publication-job-names",
  "sourcePr": 771,
  "archive": "openspec/changes/archive/2026-10-15-readable-publication-job-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-readable-publication-job-names/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "fd688d3d9f411ca03e4d1d570ba3e0dca25201d5",
  "acceptanceScenarios": [
    "A development publication lists its skipped Windows jobs as `Validate Windows shard` and `Reconstruct Windows lane` instead of raw `${{ matrix.* }}` templates.",
    "Running publication lanes still identify their platform, Node version, and shard through GitHub's automatic matrix suffix.",
    "Publication job ids, conditions, matrices, and the aggregate outcome are unchanged."
  ],
  "archiveDigest": "e03777cff248c0a8643285349dd759a4e3b17e348b212463d30b12522345817f",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "4375b302434944e0d526517a2dd86b950afbbcacd9a9fb26e7c031736eb67292",
  "evidenceDigest": "55f92129d9ae3dda8b043c0fc9f851719ff5df71bddb57c961065ceb013a08d2",
  "knownGaps": []
}
```
