# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Eligible standalone text-default emoji in displayed prose request Unicode emoji presentation without a per-icon replacement list.
- Existing emoji sequences and explicit text-presentation selectors remain unchanged, as do code, diagrams, paths, and link destinations.
- Display-only selectors use the correct wrapping and selection widths while application copying retains original selector choices.
- Generated image-file chips use an emoji-presenting icon and one separator, with atomic editing, attachment identities, and exact path expansion retained.
- Legacy image labels remain recognized and durable history accepts both legacy and emoji-presentation image identifiers without migration.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-paste-emoji-presentation",
  "sourcePr": 931,
  "archive": "openspec/changes/archive/2026-11-14-fix-paste-emoji-presentation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-fix-paste-emoji-presentation/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "36e783c4cd051ad83beb8ab6708593b33607516f",
  "acceptanceScenarios": [
    "Eligible standalone text-default emoji in displayed prose request Unicode emoji presentation without a per-icon replacement list.",
    "Existing emoji sequences and explicit text-presentation selectors remain unchanged, as do code, diagrams, paths, and link destinations.",
    "Display-only selectors use the correct wrapping and selection widths while application copying retains original selector choices.",
    "Generated image-file chips use an emoji-presenting icon and one separator, with atomic editing, attachment identities, and exact path expansion retained.",
    "Legacy image labels remain recognized and durable history accepts both legacy and emoji-presentation image identifiers without migration."
  ],
  "archiveDigest": "a6cb6fa6ce087cdd1bcd5e09661beaf06351f245fbd03c9109db1a391def3d3e",
  "specDigest": "5681c44aa48469c8b543f71e393d261148fa8beebd796192126992da1c80414b",
  "tasksDigest": "3469d0be7e62252ca0351f5264bba619f428060dcc25777da625dde5058cf960",
  "evidenceDigest": "ea76977f6caa78a24f90c429ea9b0d44a24411cb7e2dc3606b79762f04fcbae4",
  "knownGaps": []
}
```
