# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pasted-image screenshot chips remain visible and editable without producing an `Image attached` notice.
- Bare A1 omits canonical original/displayed resize guidance from the visible submitted prompt.
- Stored and model-facing messages retain the resize guidance and image attachment unchanged.
- Conversion and omission failures remain visible, while `a1 pi` retains its original inline presentation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hide-pasted-image-markers",
  "sourcePr": 549,
  "archive": "openspec/changes/archive/2026-09-22-hide-pasted-image-markers/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-hide-pasted-image-markers/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9ecb43861946b084665a8d8e68072c825d033731",
  "acceptanceScenarios": [
    "Pasted-image screenshot chips remain visible and editable without producing an `Image attached` notice.",
    "Bare A1 omits canonical original/displayed resize guidance from the visible submitted prompt.",
    "Stored and model-facing messages retain the resize guidance and image attachment unchanged.",
    "Conversion and omission failures remain visible, while `a1 pi` retains its original inline presentation."
  ],
  "archiveDigest": "ef5e5db4261ce61a7f488b6c24fefaaff3582fe07a36bc908b341210f0f67317",
  "specDigest": "4f2599c9b0b7ce4a7fc989a76024feef371f03d69df38257205b4d6ed85d9098",
  "tasksDigest": "1ff7bd45f3a7150067dd079bec8f38cdbed4fc316ed409f616037f8766d0ea65",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
