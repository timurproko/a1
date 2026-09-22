# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Fitting pending steering and its edit hint remain directly above the live working status instead of appearing beside transcript content.
- Growing transcript content consumes the fitting alignment gap without moving the steering/status group or pinned dock.
- Overflow retains one ordered, scrollable steering/status tail while the editor and footer remain pinned.
- Queue editing, transcript selection exclusion, and the `a1 pi` comparison presentation remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-steering-above-status",
  "sourcePr": 554,
  "archive": "openspec/changes/archive/2026-09-22-align-steering-above-status/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-align-steering-above-status/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9d2074cf2a8152d191b54d4d8b01d7ae6efacb03",
  "acceptanceScenarios": [
    "Fitting pending steering and its edit hint remain directly above the live working status instead of appearing beside transcript content.",
    "Growing transcript content consumes the fitting alignment gap without moving the steering/status group or pinned dock.",
    "Overflow retains one ordered, scrollable steering/status tail while the editor and footer remain pinned.",
    "Queue editing, transcript selection exclusion, and the `a1 pi` comparison presentation remain unchanged."
  ],
  "archiveDigest": "d3747297b2100441621aa67405b5dccaa532b67608cd79b2e2bcc8e0c0df9c0a",
  "specDigest": "be777d2c3d681c350289c9fdf441145a99b4d76bdb36a5b2d544cbe7a7c8c7da",
  "tasksDigest": "4703e6f49d98bbbf2ff7765efaf292184281fe14ababda4e9630c4fd2cae1fa1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
