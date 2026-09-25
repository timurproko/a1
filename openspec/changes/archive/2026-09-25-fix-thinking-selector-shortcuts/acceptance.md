# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Space moves the `[default]` marker to the highlighted thinking level without persisting or closing.
- Ctrl+S saves the staged default through the persisted thinking workflow.
- Ctrl+C leaves the selector open, while Escape closes it and restores the parent surface.
- The footer reads `Enter select  Space default  Ctrl+S save  Esc close`, and `a1 pi` retains pinned behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-thinking-selector-shortcuts",
  "sourcePr": 594,
  "archive": "openspec/changes/archive/2026-09-25-fix-thinking-selector-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-fix-thinking-selector-shortcuts/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "92e3ed375ce7d16e52dbb8b0a9d64ac829701bff",
  "acceptanceScenarios": [
    "Space moves the `[default]` marker to the highlighted thinking level without persisting or closing.",
    "Ctrl+S saves the staged default through the persisted thinking workflow.",
    "Ctrl+C leaves the selector open, while Escape closes it and restores the parent surface.",
    "The footer reads `Enter select  Space default  Ctrl+S save  Esc close`, and `a1 pi` retains pinned behavior."
  ],
  "archiveDigest": "67089373247e51921c00e9e07ba8de5a1aaa93e755365c1e56de94bd6eeacf53",
  "specDigest": "6da0c1ad624143e3d34fd64beaa727cf00a64dfbb138f110f896ce511f978839",
  "tasksDigest": "1f28831247b71025c27c3b727ab2710a50903d5d4d308ea53ce6e91bc1b1cd40",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
