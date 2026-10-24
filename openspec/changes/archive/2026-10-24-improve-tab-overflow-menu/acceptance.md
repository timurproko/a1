# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow chooser lists all available resident tabs in order and checks only tabs with visible strip chips.
- Resizing or changing tabs refreshes the chooser without stale targets, and hidden tabs remain selectable.
- A truncated A1 usage footer shows a single dim ellipsis while ordinary footer text, Pi comparison styling, and linked PR badges retain their behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-tab-overflow-menu",
  "sourcePr": 827,
  "archive": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "249897fcdddca6cfba2e74efcb28c73b2b8d5c18",
  "acceptanceScenarios": [
    "The overflow chooser lists all available resident tabs in order and checks only tabs with visible strip chips.",
    "Resizing or changing tabs refreshes the chooser without stale targets, and hidden tabs remain selectable.",
    "A truncated A1 usage footer shows a single dim ellipsis while ordinary footer text, Pi comparison styling, and linked PR badges retain their behavior."
  ],
  "archiveDigest": "b2c9e0dad8d6f3d91f78fec3015cca05bbdc49e83e09d9e905848b2051954edf",
  "specDigest": "7d3c1b1b088d0124eff91ddfdffec6affd01553413d0615a446cb9e884654935",
  "tasksDigest": "2b7c675486b3f7463c10f7babb729e57abf93e5e337beebdc24fd9314dfca7d6",
  "evidenceDigest": "c20c3d51eb04cde0b07b62eaa02639f0a4093c209d600770f305cac62bb421d3",
  "knownGaps": []
}
```
