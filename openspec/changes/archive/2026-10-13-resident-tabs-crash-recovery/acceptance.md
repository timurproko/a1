# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Killing a tab's A1 process restarts it into its transcript; after three crashes in ten minutes it shows failed with retry, start fresh, and close while other tabs keep working
- A prompt submitted before a crash, including on a new tab's first turn, is offered back in the editor and never resent
- After thirty seconds of continuous typing and a kill, at most the last second of the draft is lost
- Text streamed before a crash stays visible in the read-only snapshot and the recovery file
- After a reboot, `a1` opens one new tab and every previous session is resumable from the picker
- Sensitive stderr from an extension never appears in logs or crash records

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-crash-recovery",
  "sourcePr": 748,
  "archive": "openspec/changes/archive/2026-10-13-resident-tabs-crash-recovery/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-13-resident-tabs-crash-recovery/acceptance.md",
  "finalizedDate": "2026-10-13",
  "specBaseSha": "986b04e466aa77af34e54fecdd91c355caf07321",
  "acceptanceScenarios": [
    "Killing a tab's A1 process restarts it into its transcript; after three crashes in ten minutes it shows failed with retry, start fresh, and close while other tabs keep working",
    "A prompt submitted before a crash, including on a new tab's first turn, is offered back in the editor and never resent",
    "After thirty seconds of continuous typing and a kill, at most the last second of the draft is lost",
    "Text streamed before a crash stays visible in the read-only snapshot and the recovery file",
    "After a reboot, `a1` opens one new tab and every previous session is resumable from the picker",
    "Sensitive stderr from an extension never appears in logs or crash records"
  ],
  "archiveDigest": "ec1a6cc0db41810e7a106786849a3dfbf991b9e21090c1b06a6b26e10261dc9a",
  "specDigest": "633942471839984395d7cdb0f2e9b00dd29cf8af30f0b8b83df0ff3c9faa53af",
  "tasksDigest": "cfbc47a0cc4324511a3a0c8b78c10dc9ad3ccb547b300c1e28b6c9428d3d8987",
  "evidenceDigest": "c129525df038df10b8518d90c82f8cafefc7de543aaaef42046153824b51e241",
  "knownGaps": []
}
```
