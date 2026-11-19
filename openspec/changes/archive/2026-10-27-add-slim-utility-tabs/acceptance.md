# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Settings and Changelog tab ids open their pinned screens without loading or starting an Agent engine or session.
- Slim utility tabs retain the owned theme, accent, shortcuts, Plus Menu, detach, close, and stop behavior.
- Settings persists Agent choices through Pi's shared settings manager and lists thinking levels from the offline profile model catalog.
- Changelog renders the packaged release notes without taking or acknowledging an Agent startup claim.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-slim-utility-tabs",
  "sourcePr": 828,
  "archive": "openspec/changes/archive/2026-10-27-add-slim-utility-tabs/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-27-add-slim-utility-tabs/acceptance.md",
  "finalizedDate": "2026-10-27",
  "specBaseSha": "10e3a7f947805e78e858b496459201129d67f8e8",
  "acceptanceScenarios": [
    "Settings and Changelog tab ids open their pinned screens without loading or starting an Agent engine or session.",
    "Slim utility tabs retain the owned theme, accent, shortcuts, Plus Menu, detach, close, and stop behavior.",
    "Settings persists Agent choices through Pi's shared settings manager and lists thinking levels from the offline profile model catalog.",
    "Changelog renders the packaged release notes without taking or acknowledging an Agent startup claim."
  ],
  "archiveDigest": "dfba4aababafc8e7cfaf9c876113cfbae188b73555ceffdfeb514311bd2ed10e",
  "specDigest": "0dff0f40b088938087fe49e3adb79373fc4483d2fca70f597e23ea40183d9e18",
  "tasksDigest": "15f6c2161906a9e604bff16862efda0804fcabd606061b1ce388d6631887f64e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
