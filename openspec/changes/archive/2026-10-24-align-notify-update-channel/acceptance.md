# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Stable `Notify` launches announce only newer stable releases with `a1 update`, even when a retained development runtime executes.
- Development `Notify` launches announce only newer development previews with `a1 update --develop`, even when another channel executes.
- Automatic updates remain aligned with the executing immutable release, and guarded launch-during-update paths avoid mutable-package reads.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-notify-update-channel",
  "sourcePr": 829,
  "archive": "openspec/changes/archive/2026-10-24-align-notify-update-channel/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-align-notify-update-channel/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "662fd5b5aa10de92f773889f0dcd2f026a285322",
  "acceptanceScenarios": [
    "Stable `Notify` launches announce only newer stable releases with `a1 update`, even when a retained development runtime executes.",
    "Development `Notify` launches announce only newer development previews with `a1 update --develop`, even when another channel executes.",
    "Automatic updates remain aligned with the executing immutable release, and guarded launch-during-update paths avoid mutable-package reads."
  ],
  "archiveDigest": "39ab7e74b769ed039bc18bd700491f8dbc3585b1a8118a105b9413f254449dc8",
  "specDigest": "1cc6e18f0759c6f710f91f3062b3bf9defa5b12163b6528ac8c41c70da4f59e1",
  "tasksDigest": "384459695480904098f27e747400ddf772e9229e95d4a4591ff566667b40e07f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
