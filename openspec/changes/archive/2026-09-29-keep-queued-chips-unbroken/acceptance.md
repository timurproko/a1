# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Fitting canonical chips remain whole on one row in pending steering and submitted prompts, even when they directly touch uninterrupted text.
- Chips wider than the complete content width render as one width-bounded ellipsized label while complete queue and model source remains unchanged.
- Queue ordering, dequeue guidance, viewport scrolling, and pinned comparison rendering remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-queued-chips-unbroken",
  "sourcePr": 621,
  "archive": "openspec/changes/archive/2026-09-29-keep-queued-chips-unbroken/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-keep-queued-chips-unbroken/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "7c25be1f9549bbd66461fd687a5ee9f42888f893",
  "acceptanceScenarios": [
    "Fitting canonical chips remain whole on one row in pending steering and submitted prompts, even when they directly touch uninterrupted text.",
    "Chips wider than the complete content width render as one width-bounded ellipsized label while complete queue and model source remains unchanged.",
    "Queue ordering, dequeue guidance, viewport scrolling, and pinned comparison rendering remain unchanged."
  ],
  "archiveDigest": "858113e3cd5c97f7e2eb50bb29c33046a2a55c12de367525cac2976246f040bf",
  "specDigest": "5f1aed222af41ea743fda7af2aef2845a1c5c4d0f509c1b7a2395a21517cd0fd",
  "tasksDigest": "85526ad36115cf2823f25c2c943bd9517221dbd0754d1db59a429f5396cc9355",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
