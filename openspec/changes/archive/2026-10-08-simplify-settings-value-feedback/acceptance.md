# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Settings rows show only the selected stored scalar value even when a deferred effective value differs.
- Successful setting changes and undo preserve shortcut guidance while failures remain visible.
- Mouse-wheel input scrolls Settings content behind a fixed structured dialog without enabling pointer editing.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-settings-value-feedback",
  "sourcePr": 720,
  "archive": "openspec/changes/archive/2026-10-08-simplify-settings-value-feedback/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-simplify-settings-value-feedback/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "1aa85c10cd4fa7f2e1d138cce94ea83b3f4f9d6c",
  "acceptanceScenarios": [
    "Settings rows show only the selected stored scalar value even when a deferred effective value differs.",
    "Successful setting changes and undo preserve shortcut guidance while failures remain visible.",
    "Mouse-wheel input scrolls Settings content behind a fixed structured dialog without enabling pointer editing."
  ],
  "archiveDigest": "d484cf51d30e5fbd81b00787dc8a061b640571df6a413c316cf63cdbf59b1e5e",
  "specDigest": "0919c86d7a3e184402d1db774013d628faa267bf90966e4e0f8efb21bb79a8bd",
  "tasksDigest": "c4bf1ee3177b6efbcf94b1dfd8a8554f9851780a019177c9a59c2c39e9845a6b",
  "evidenceDigest": "0afbbea4b0c297d4422cb6b1ded706bc302332fc8db893c7ac8cf198b88c148a",
  "knownGaps": []
}
```
