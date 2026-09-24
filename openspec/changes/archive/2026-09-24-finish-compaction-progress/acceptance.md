# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 shows `Compacting(100%)` after an observable summary stream finishes normally instead of remaining at 99%.
- Failed, stale, ended, or disposed observations never publish false terminal progress.
- Compaction remains active at 100% until Pi’s real compaction-end event clears the status.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "finish-compaction-progress",
  "sourcePr": 577,
  "archive": "openspec/changes/archive/2026-09-24-finish-compaction-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-finish-compaction-progress/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "66d91a0353e8a54d51b1db90b750397bbc5ce032",
  "acceptanceScenarios": [
    "Bare A1 shows `Compacting(100%)` after an observable summary stream finishes normally instead of remaining at 99%.",
    "Failed, stale, ended, or disposed observations never publish false terminal progress.",
    "Compaction remains active at 100% until Pi’s real compaction-end event clears the status."
  ],
  "archiveDigest": "bf49ebd9c14935e7f83a3c48a492c25c491f560e81684208c584ffca56506099",
  "specDigest": "716a482ecdf8129c082486d75ce6eeac23cb432a650224944ad276292b9a02d1",
  "tasksDigest": "189acf4998ba6b412c650685bc0632f09341f0970c62dff28180cbcc6f0ce5c7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
