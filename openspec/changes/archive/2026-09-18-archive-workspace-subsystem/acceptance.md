# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare `a1` and `a1 pi` launch and run unchanged; a fresh control store holds only `launch_instances` and `product_identity` at version 7.
- A control store written by an earlier release migrates to version 7 with its launch instances intact and the retired tables gone.
- The architecture allowlist lists no workspace module and the owner, validation, and integration registries no longer name the archived subsystem.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "archive-workspace-subsystem",
  "sourcePr": 476,
  "archive": "openspec/changes/archive/2026-09-18-archive-workspace-subsystem/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-archive-workspace-subsystem/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "0a70298fe41e8c74f195131dc77d4ccb9b51088c",
  "acceptanceScenarios": [
    "Bare `a1` and `a1 pi` launch and run unchanged; a fresh control store holds only `launch_instances` and `product_identity` at version 7.",
    "A control store written by an earlier release migrates to version 7 with its launch instances intact and the retired tables gone.",
    "The architecture allowlist lists no workspace module and the owner, validation, and integration registries no longer name the archived subsystem."
  ],
  "archiveDigest": "d4b12da416eacccda7446b749dbec7276bef70ab09ecb9c0b60c7c3e6aec4e15",
  "specDigest": "ea2501f26b856291071b62ae93195b56ce9d5400e0c63afdb9ad3f25c1b28777",
  "tasksDigest": "fab0acab51f42a9cd016d9a5a4079a1d14e9ab876725a41b844d04306735f6c9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
