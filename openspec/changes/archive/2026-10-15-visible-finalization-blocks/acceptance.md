# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A fully checked draft whose Acceptance item contains angle-bracket text shows a failed OpenSpec finalization check naming `draft-acceptance-checklist-item`.
- A draft with any unchecked Implementation item still gets a successful finalization run and stays draft quietly.
- Running `check-delivery-body.mjs --final` on a body with a placeholder, URL, or mention exits 1 with the same reason the finalization run reports.
- The change-delivery skill and runbook tell agents to pass the body check before checking the final Implementation item.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "visible-finalization-blocks",
  "sourcePr": 774,
  "archive": "openspec/changes/archive/2026-10-15-visible-finalization-blocks/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-visible-finalization-blocks/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "37bc59a76963c39810546df04ba76146ba8095e5",
  "acceptanceScenarios": [
    "A fully checked draft whose Acceptance item contains angle-bracket text shows a failed OpenSpec finalization check naming `draft-acceptance-checklist-item`.",
    "A draft with any unchecked Implementation item still gets a successful finalization run and stays draft quietly.",
    "Running `check-delivery-body.mjs --final` on a body with a placeholder, URL, or mention exits 1 with the same reason the finalization run reports.",
    "The change-delivery skill and runbook tell agents to pass the body check before checking the final Implementation item."
  ],
  "archiveDigest": "87e881b31c64ac68b540e8eb9a080b0f5837ff6932f252c0d99570b9571e5784",
  "specDigest": "9ff475cef245002d235eca45ae4c8570a705c164b92926aa8426b32fe2070778",
  "tasksDigest": "ec571699b01feaf9c301d1445d7097e33d08a3c5dfaad1651966cda6d6320124",
  "evidenceDigest": "5a038cb860ce88b90fc862f70f22480525a4ca83a67baed313eda9c9321bec80",
  "knownGaps": []
}
```
