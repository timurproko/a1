# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Registry readiness requires both downloadable tarballs to match their validated SHA-512 and SHA-1 digests.
- Failed native installation, predecessor update, or launcher checks leave user-facing npm tags unchanged.
- Successful native checks permit trusted promotion of the same immutable application and installer packages.
- Failed published-installer checks retain bounded sanitized diagnostics before fixture cleanup.
- Windows replacement failures preserve committed files, and pre-commit update failures restore prior-release launchers without racing npm.
- A committed activation remains successful when journal bookkeeping fails, with recovery authority retained for retry.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "verify-published-tarball-readiness",
  "sourcePr": 936,
  "archive": "openspec/changes/archive/2026-11-14-verify-published-tarball-readiness/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-verify-published-tarball-readiness/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "18f387aa4ffe026b980cc65b2fd07644216950e7",
  "acceptanceScenarios": [
    "Registry readiness requires both downloadable tarballs to match their validated SHA-512 and SHA-1 digests.",
    "Failed native installation, predecessor update, or launcher checks leave user-facing npm tags unchanged.",
    "Successful native checks permit trusted promotion of the same immutable application and installer packages.",
    "Failed published-installer checks retain bounded sanitized diagnostics before fixture cleanup.",
    "Windows replacement failures preserve committed files, and pre-commit update failures restore prior-release launchers without racing npm.",
    "A committed activation remains successful when journal bookkeeping fails, with recovery authority retained for retry."
  ],
  "archiveDigest": "f4a140b73945336e154a8e5ac2854147d5fb55f90100b8c384c03e7fc0c006c4",
  "specDigest": "7d35e188149a0078d2dbdabfa3c21d4f047099a18cfcaf076bf537362f5b004d",
  "tasksDigest": "b4a498d0c4ff8c488fe2fc8a6cacec64dd80820394a636bcd8eec4d762084187",
  "evidenceDigest": "088282c8d8fc7b44a2d1b957710c8e1a0b2b3d8a8187260ab26fc8392e812195",
  "knownGaps": []
}
```
