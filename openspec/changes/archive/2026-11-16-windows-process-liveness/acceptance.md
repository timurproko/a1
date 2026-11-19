# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- On Windows, a session-control record whose owner pid answers access denied but is absent from the process table is judged dead and pruned on the next session start or lookup.
- A live process the caller cannot open remains a live candidate because the process table lists it.
- An unreadable process table leaves a permission-refused pid alive, exactly as before.
- Unix permission refusals and all signal-success/ESRCH outcomes are unchanged.
- One process-table read serves a whole sweep or lookup through a two-second in-process cache.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "windows-process-liveness",
  "sourcePr": 961,
  "archive": "openspec/changes/archive/2026-11-16-windows-process-liveness/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-windows-process-liveness/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "fb28fb83b581079a590b68c5d9c36ff91a9bc33f",
  "acceptanceScenarios": [
    "On Windows, a session-control record whose owner pid answers access denied but is absent from the process table is judged dead and pruned on the next session start or lookup.",
    "A live process the caller cannot open remains a live candidate because the process table lists it.",
    "An unreadable process table leaves a permission-refused pid alive, exactly as before.",
    "Unix permission refusals and all signal-success/ESRCH outcomes are unchanged.",
    "One process-table read serves a whole sweep or lookup through a two-second in-process cache."
  ],
  "archiveDigest": "853048f01882e5d638d281197449bf79ac7680a6b2405d0a9f9d4981d80cff7a",
  "specDigest": "8dafa40605db428129e26a30197c852fe9bac1c84155c8ea4d211585eff0b4dd",
  "tasksDigest": "f12bf3166994965001b67cded37dc24bbaddf959ecfc712b394743ba5c058106",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
