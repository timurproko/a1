# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- During a compaction whose summarization stream is observable, bare A1 shows `Compacting (n%)...` with n rising from 0 and never reaching 100 until the label disappears at compaction end; the `a1 pi` route and an unobservable stream show `Compacting...`.
- Messages submitted during compaction appear immediately as `Steering:` rows, Alt+Up returns all of them to the editor, and after a manual compaction the first starts one run while the rest are injected into it in submission order with their attachments.
- Automatic compaction leaves delivery to the engine's continuing run or pending prompt, and no `Queued during compaction` notice or private replay remains.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "compaction-progress-and-queued-input",
  "sourcePr": 465,
  "archive": "openspec/changes/archive/2026-09-17-compaction-progress-and-queued-input/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-compaction-progress-and-queued-input/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "794a84f01dab22f6e124ae1e2f3603d1e561bbd7",
  "acceptanceScenarios": [
    "During a compaction whose summarization stream is observable, bare A1 shows `Compacting (n%)...` with n rising from 0 and never reaching 100 until the label disappears at compaction end; the `a1 pi` route and an unobservable stream show `Compacting...`.",
    "Messages submitted during compaction appear immediately as `Steering:` rows, Alt+Up returns all of them to the editor, and after a manual compaction the first starts one run while the rest are injected into it in submission order with their attachments.",
    "Automatic compaction leaves delivery to the engine's continuing run or pending prompt, and no `Queued during compaction` notice or private replay remains."
  ],
  "archiveDigest": "ae7672c1e4bebfbd06b1798e91e54cb6c7aa6b6dfc355acf3d778afb0a7c5924",
  "specDigest": "6f35070ba4959d18ac220203a45e574484c0de94708e8b9def0de390c57f9930",
  "tasksDigest": "94a7a1deac185e229a2c836cfa84f59e4c271ed8a91506be1b42786680ad1a77",
  "evidenceDigest": "3043f177a354a54a94c33ea53b46764393f6b8195a3dedf9bf29c7606b41ed91",
  "knownGaps": []
}
```
