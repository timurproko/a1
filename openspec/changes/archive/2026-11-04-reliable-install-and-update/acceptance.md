# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A host started before a macOS clock correction stays attachable, updatable, and keeps its tabs after the correction.
- An update while an older host runs Agents exits zero with one line and takes over automatically later.
- Launching `a1` never ends in a closed attach handshake when its own release's host is healthy.
- Exiting `a1` prints no exit-watcher error and still shows the running-Agent reminder.
- `a1 update` on a development build stays on develop, and `a1 update --release` moves to the release.
- A release installer given `--develop` runs the development installer and succeeds on Node 26.
- An installation newer than its channel head is reported as installed instead of a version mismatch.
- `a1 uninstall` stops every A1 process and removes A1, keeping sessions and settings unless purged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "reliable-install-and-update",
  "sourcePr": 868,
  "archive": "openspec/changes/archive/2026-11-04-reliable-install-and-update/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-04-reliable-install-and-update/acceptance.md",
  "finalizedDate": "2026-11-04",
  "specBaseSha": "c3b7a3fd5d44c998b87847f0f79422bdbb459355",
  "acceptanceScenarios": [
    "A host started before a macOS clock correction stays attachable, updatable, and keeps its tabs after the correction.",
    "An update while an older host runs Agents exits zero with one line and takes over automatically later.",
    "Launching `a1` never ends in a closed attach handshake when its own release's host is healthy.",
    "Exiting `a1` prints no exit-watcher error and still shows the running-Agent reminder.",
    "`a1 update` on a development build stays on develop, and `a1 update --release` moves to the release.",
    "A release installer given `--develop` runs the development installer and succeeds on Node 26.",
    "An installation newer than its channel head is reported as installed instead of a version mismatch.",
    "`a1 uninstall` stops every A1 process and removes A1, keeping sessions and settings unless purged."
  ],
  "archiveDigest": "0b33a2254a291eb6425c26e8eeb6ab0386e24f9f83d0c62bfd8f98b1ce589c85",
  "specDigest": "951c50ae5d99f4a5f4f2f48618d7019c514cc6d22aa2737b0beac35c028b22da",
  "tasksDigest": "fe86d7ec23495849a6653f9d851d8069345be1641b61956a3641bc9f060630d9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
