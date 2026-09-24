# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Copied-character feedback appears and expires without reallocating the frame or moving transcript, editor, footer, controls, or hit regions.
- Followed agent output carries document selection with its source while footer, status, prompt, widget, and notice selection remains pinned.
- Mixed selections project each endpoint by surface, clip off-screen content, and clear ambiguous replaced sources instead of selecting unrelated cells.
- Automatic and explicit copy, detached navigation, edge auto-scroll, modal ownership, and the comparison profile retain their established behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stabilize-copy-feedback-and-selection",
  "sourcePr": 579,
  "archive": "openspec/changes/archive/2026-09-24-stabilize-copy-feedback-and-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-stabilize-copy-feedback-and-selection/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "93f6928f55c35ae2e1d9c7b21deb5377557fdb65",
  "acceptanceScenarios": [
    "Copied-character feedback appears and expires without reallocating the frame or moving transcript, editor, footer, controls, or hit regions.",
    "Followed agent output carries document selection with its source while footer, status, prompt, widget, and notice selection remains pinned.",
    "Mixed selections project each endpoint by surface, clip off-screen content, and clear ambiguous replaced sources instead of selecting unrelated cells.",
    "Automatic and explicit copy, detached navigation, edge auto-scroll, modal ownership, and the comparison profile retain their established behavior."
  ],
  "archiveDigest": "67fffd60413632130091b53ddd8a2ed156f3907b7725b5fa43d1c5f4fb95149d",
  "specDigest": "5824c01cca1b86f87b87ef7864fe5b27e1a4ae26d3954fbc3e608678d80bbcec",
  "tasksDigest": "a42818458b213320097861bf35664936988a98549e1cb927b9a242675cd5ea6c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
