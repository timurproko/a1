# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Crashed upgraded mutation holders and corrupted metadata recover without manual lock deletion while live editing claims remain protected.
- Runtime registration recovers after transient startup failures in the same session, with coalesced retries and no publication after disposal.
- Legacy regular-file gates remain intact and report a stopped-process recovery procedure instead of generic indefinite contention.
- Missing native support, unsafe paths, and filesystem failures produce actionable diagnostics without exposing another session's details.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "worktree-link-self-recovery",
  "sourcePr": 869,
  "archive": "openspec/changes/archive/2026-11-05-worktree-link-self-recovery/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-05-worktree-link-self-recovery/acceptance.md",
  "finalizedDate": "2026-11-05",
  "specBaseSha": "4a4ec11bb234d121938edf16599e1bc05d08be15",
  "acceptanceScenarios": [
    "Crashed upgraded mutation holders and corrupted metadata recover without manual lock deletion while live editing claims remain protected.",
    "Runtime registration recovers after transient startup failures in the same session, with coalesced retries and no publication after disposal.",
    "Legacy regular-file gates remain intact and report a stopped-process recovery procedure instead of generic indefinite contention.",
    "Missing native support, unsafe paths, and filesystem failures produce actionable diagnostics without exposing another session's details."
  ],
  "archiveDigest": "64f9048805b3390c47cd44e7d4325f019bd3067df1490edee8adc85dbeea8104",
  "specDigest": "a5a9fe829c3d785b1721e8d99f6e4ea440b30d14f59d7c1630a7c4077b05f265",
  "tasksDigest": "d338fa2f3ac4fce557a8051ed328807ddb0116f37153af699da2707ba4ae0600",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
