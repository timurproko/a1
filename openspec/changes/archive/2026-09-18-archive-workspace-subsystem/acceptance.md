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
  "archiveDigest": "c43130856e5e002f3854ca5ba84e09ba4b3e77a9e06a19f9ecd47117eeb3094c",
  "specDigest": "ea2501f26b856291071b62ae93195b56ce9d5400e0c63afdb9ad3f25c1b28777",
  "tasksDigest": "bf6ecb66f79292526c4bda6322b118d8c1a51fba2f1e14dfc3385cca1db7d9d3",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
