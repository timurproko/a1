# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Overlapping cohort state updates on Windows wait out a lock file that is still being released instead of failing with `EPERM` or `EACCES`.
- `EPERM` from the lock open stays fatal on Linux and macOS.
- `release-gc.test.ts > converges when two cleanup coordinators overlap` passes on the Windows stable candidate lanes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-cohort-lock-windows-contention",
  "sourcePr": 753,
  "archive": "openspec/changes/archive/2026-10-10-fix-cohort-lock-windows-contention/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-fix-cohort-lock-windows-contention/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "6ef60f13459ff9683cd30dba874ebc81e61b5131",
  "acceptanceScenarios": [
    "Overlapping cohort state updates on Windows wait out a lock file that is still being released instead of failing with `EPERM` or `EACCES`.",
    "`EPERM` from the lock open stays fatal on Linux and macOS.",
    "`release-gc.test.ts > converges when two cleanup coordinators overlap` passes on the Windows stable candidate lanes."
  ],
  "archiveDigest": "659a878110d66c84daf3d628503e64af92a43b5ef21a9e4dde2c40e6daca1c7c",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "792ba02443c87ac1016e451d95a7b03609f82a5b88216e641237124baa9adca6",
  "evidenceDigest": "41110f2893da55b4c577135f1f52a081bbb001aac5a3f05bb7d75b0d5b65ac89",
  "knownGaps": []
}
```
