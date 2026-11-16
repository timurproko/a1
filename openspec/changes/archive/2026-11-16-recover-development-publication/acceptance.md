# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A development preview is already published only when both exact package versions exist and both public next tags name that version.
- Staged-only, partially present, and partially promoted pairs enter recovery through the existing publication workflow without overwriting existing bytes.
- Recovery shows explicit intent, the run link, live job states and step counts, and the ordinary final success or actionable failure result.
- Missing versions, wrong public tags, and unavailable or malformed registry state prevent a false successful publication result.
- Interrupting recovery observation leaves the remote workflow running and reports its link without bypassing native smoke or promotion checks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "recover-development-publication",
  "sourcePr": 956,
  "archive": "openspec/changes/archive/2026-11-16-recover-development-publication/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-recover-development-publication/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "2871e19baba6628a43f19068e97e72a3538b07f3",
  "acceptanceScenarios": [
    "A development preview is already published only when both exact package versions exist and both public next tags name that version.",
    "Staged-only, partially present, and partially promoted pairs enter recovery through the existing publication workflow without overwriting existing bytes.",
    "Recovery shows explicit intent, the run link, live job states and step counts, and the ordinary final success or actionable failure result.",
    "Missing versions, wrong public tags, and unavailable or malformed registry state prevent a false successful publication result.",
    "Interrupting recovery observation leaves the remote workflow running and reports its link without bypassing native smoke or promotion checks."
  ],
  "archiveDigest": "ca780d602766a5ac4fa708b1d51284ea5fdec527dab556f4cc62e13feef143c7",
  "specDigest": "de6e65b1c18a3c3fe82cd2a3e7f80f0b8144a5fe8128ce6f589c8c33879eb39c",
  "tasksDigest": "15a98f5d25eb89ef4f500e23b9d5263544964fd984d10ff324f5b55301cf0dc4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
