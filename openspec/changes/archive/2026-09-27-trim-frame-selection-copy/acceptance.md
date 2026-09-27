# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Complete-frame selection removes Unicode whitespace only from the clipboard payload boundaries.
- Multiline indentation, internal spacing, blank lines, and the visual highlight remain unchanged.
- Automatic release copy and retained-selection `Ctrl+C` deliver the same normalized payload and character count.
- Whitespace-only frame selections clear stale clipboard text without showing success feedback.
- Prompt copy/cut, semantic `/copy`, `a1 pi`, and regular terminal selection retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "trim-frame-selection-copy",
  "sourcePr": 598,
  "archive": "openspec/changes/archive/2026-09-27-trim-frame-selection-copy/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-trim-frame-selection-copy/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "a22d1e8d701f45e3962bdde417680899fa25f4c7",
  "acceptanceScenarios": [
    "Complete-frame selection removes Unicode whitespace only from the clipboard payload boundaries.",
    "Multiline indentation, internal spacing, blank lines, and the visual highlight remain unchanged.",
    "Automatic release copy and retained-selection `Ctrl+C` deliver the same normalized payload and character count.",
    "Whitespace-only frame selections clear stale clipboard text without showing success feedback.",
    "Prompt copy/cut, semantic `/copy`, `a1 pi`, and regular terminal selection retain their existing behavior."
  ],
  "archiveDigest": "fb8c0ebbc91947ecffe1600cf6b34515c5e94a63d7439dd69727b6c63c13eb88",
  "specDigest": "1368d2b4e7d7a03ce15f110b31628a35cd94b959f4d11b97dc3e249ccf5b2b9d",
  "tasksDigest": "deee64d192e0a7055beac06e9c51a781828d4e1c23d2ae3f71249d48a1b7c7bb",
  "evidenceDigest": "010a4476a4f66b96589d7c57cf8583ee34a77517d280a854e0e9ce8c2657580e",
  "knownGaps": []
}
```
