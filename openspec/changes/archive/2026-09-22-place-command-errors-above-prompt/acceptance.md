# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 renders simple workflow errors and warnings in the transient notice immediately above the editor instead of in transcript content.
- Empty-session `/export` shows its exact red contextual failure without a top-left message or large gap.
- Prompt-adjacent notices preserve their severity prefix, color, padding, wording, and width-aware wrapping.
- The newest notice replaces the prior severity while submissions, structured presentations, and resets dismiss it without agent activity doing so.
- Extension errors and warnings use the same notice lifecycle while structured output and the pinned comparison route retain transcript placement.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-command-errors-above-prompt",
  "sourcePr": 548,
  "archive": "openspec/changes/archive/2026-09-22-place-command-errors-above-prompt/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-place-command-errors-above-prompt/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9fa1e231a33ab9aad337850d843739cfcedc88b4",
  "acceptanceScenarios": [
    "Bare A1 renders simple workflow errors and warnings in the transient notice immediately above the editor instead of in transcript content.",
    "Empty-session `/export` shows its exact red contextual failure without a top-left message or large gap.",
    "Prompt-adjacent notices preserve their severity prefix, color, padding, wording, and width-aware wrapping.",
    "The newest notice replaces the prior severity while submissions, structured presentations, and resets dismiss it without agent activity doing so.",
    "Extension errors and warnings use the same notice lifecycle while structured output and the pinned comparison route retain transcript placement."
  ],
  "archiveDigest": "e69c25f42be8a4cc078cc8d3cdcbc803c0e68a2dbe5c5b020c21fd7d519c2dae",
  "specDigest": "1ce412950e173b19f9d22e4deab1b83c7d804ffa1ffcae292376db1e2d81f26e",
  "tasksDigest": "d7ee1bea8e66de58dd2c1be96e6f410136e1918efe91ac468a28cba4f448d9f9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
