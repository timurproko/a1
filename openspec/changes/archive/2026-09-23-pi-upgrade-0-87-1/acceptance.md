# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Claude Opus 5.5, GPT-6 Sol, and GPT-6 Luna are available through each supported pinned provider in A1 model selection.
- A new xAI login selects Grok 4.7 as the active default model.
- Compaction summaries and inherited image-only messages use the corrected pinned 0.87.1 request behavior.
- Upgrade provenance, inventories, public API, and regression evidence resolve to Pi 0.87.1 without changing vendored presentation behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-87-1",
  "sourcePr": 560,
  "archive": "openspec/changes/archive/2026-09-23-pi-upgrade-0-87-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-pi-upgrade-0-87-1/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "464f9943498e42292db21b68d69d7040f7922ae1",
  "acceptanceScenarios": [
    "Claude Opus 5.5, GPT-6 Sol, and GPT-6 Luna are available through each supported pinned provider in A1 model selection.",
    "A new xAI login selects Grok 4.7 as the active default model.",
    "Compaction summaries and inherited image-only messages use the corrected pinned 0.87.1 request behavior.",
    "Upgrade provenance, inventories, public API, and regression evidence resolve to Pi 0.87.1 without changing vendored presentation behavior."
  ],
  "archiveDigest": "d87b5a1442c56290071331ca8023a3f56bdf16b191200e0020f3c62ae519420c",
  "specDigest": "5f5edb8b3398c0ae883b9f2c4dd05acacfc0383fb7edc18e8f94683cb3b0e584",
  "tasksDigest": "310014f923f1eb19b9fc95784d3c251fafb149fa054718b015aa4ddc73497fe4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
