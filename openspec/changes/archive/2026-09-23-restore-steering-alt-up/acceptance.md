# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 uses `Alt+Up` to restore pending steering and follow-up messages while the pinned comparison profile retains its upstream platform default.
- Restored messages return to the editor in queue order and disappear from the pending steering rows.
- Startup help, `/hotkeys`, and the pending-queue hint show the effective restore binding, including explicit user overrides.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-steering-alt-up",
  "sourcePr": 566,
  "archive": "openspec/changes/archive/2026-09-23-restore-steering-alt-up/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-restore-steering-alt-up/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "2fd59d4bba46e98a3bfe6240f25a5a71e474d542",
  "acceptanceScenarios": [
    "Bare A1 uses `Alt+Up` to restore pending steering and follow-up messages while the pinned comparison profile retains its upstream platform default.",
    "Restored messages return to the editor in queue order and disappear from the pending steering rows.",
    "Startup help, `/hotkeys`, and the pending-queue hint show the effective restore binding, including explicit user overrides."
  ],
  "archiveDigest": "e682efea4fa8a09b658ee1768498ac06202e4eda66e57d6ddcaf72ad8783940c",
  "specDigest": "0b4fd15f2f6c7922368614ce520e5c4ed9750c60646b22958be8e5d6b1addb46",
  "tasksDigest": "393ee0f9798cd308aa32b6ab7f619bb950bcfedc547cb081555bd02619f4dca0",
  "evidenceDigest": "66ad6cd55f06508b85a6e33d717c02c1b2772cf01eb891bd959b0d5faed72555",
  "knownGaps": []
}
```
