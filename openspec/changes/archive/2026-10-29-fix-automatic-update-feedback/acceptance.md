# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Automatic installation opens no additional Windows console window while explicit update progress remains in its invoking terminal.
- Older bare A1 sessions show one green `Update installed, restart to update` message on the copy-feedback line without moving Working or the editor.
- `Copied N chars to clipboard` temporarily replaces restart readiness, including after repeated copies, before the update message returns until restart.
- The pinned comparison uses the same green restart wording; failed or current updates show no restart message.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-automatic-update-feedback",
  "sourcePr": 852,
  "archive": "openspec/changes/archive/2026-10-29-fix-automatic-update-feedback/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-29-fix-automatic-update-feedback/acceptance.md",
  "finalizedDate": "2026-10-29",
  "specBaseSha": "9fccb714f2912d0acdd9e7a4ed05d6d8423a82bd",
  "acceptanceScenarios": [
    "Automatic installation opens no additional Windows console window while explicit update progress remains in its invoking terminal.",
    "Older bare A1 sessions show one green `Update installed, restart to update` message on the copy-feedback line without moving Working or the editor.",
    "`Copied N chars to clipboard` temporarily replaces restart readiness, including after repeated copies, before the update message returns until restart.",
    "The pinned comparison uses the same green restart wording; failed or current updates show no restart message."
  ],
  "archiveDigest": "84b79a32cdb099b46753a38633cea636a6f05c9ed05e101423ada0e1955db313",
  "specDigest": "bbc2eb98310837f6cdcb06eacef619bd11f85fe8352d376c8a6b34d435edc3f8",
  "tasksDigest": "de02009ff01c50d2328f6678dd2a6b03322d1c9c628c69078081b79b08fae968",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
