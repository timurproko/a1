# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Vertical touchpad gestures scroll the transcript only in their reported direction when horizontal wheel reports are interleaved.
- Horizontal wheel reports neither move the transcript nor leak into focused input.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-touchpad-scroll-direction",
  "sourcePr": 533,
  "archive": "openspec/changes/archive/2026-09-21-fix-touchpad-scroll-direction/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-fix-touchpad-scroll-direction/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "5f5a349247b532142ae54070ff1fb9d4f6d9a5cc",
  "acceptanceScenarios": [
    "Vertical touchpad gestures scroll the transcript only in their reported direction when horizontal wheel reports are interleaved.",
    "Horizontal wheel reports neither move the transcript nor leak into focused input."
  ],
  "archiveDigest": "ada45b0ce15b4f75594aafa8a5e85bc0c71e7746d47fae0b31ea110c14aa5aec",
  "specDigest": "257f831d02a167dcea5159a3f86e1cab932b6c69e434df07bdc84f8346f5db1d",
  "tasksDigest": "3ff90c240196dace44e23730fb60d61594a8177a8e36c79a9412a4f736051f1f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
