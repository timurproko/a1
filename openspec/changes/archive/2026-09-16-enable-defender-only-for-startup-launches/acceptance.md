# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A Windows publication lane installs its dependencies and the exact candidate with protection in the runner default state, enables protection before the first packaged launch, and the startup gate still proves protection is on from inside the measured run.
- The lane performs exactly one exact-package installation and its consuming owners report separate outcomes against a verified shared preparation.
- A handoff that is malformed, contradicts the plan, or fails verification fails the run with one preparation outcome and installs nothing a second time.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "enable-defender-only-for-startup-launches",
  "sourcePr": 444,
  "archive": "openspec/changes/archive/2026-09-16-enable-defender-only-for-startup-launches/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-enable-defender-only-for-startup-launches/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "9d253ace4a2eced7d1a69064ad20ae5aaa7c83fd",
  "acceptanceScenarios": [
    "A Windows publication lane installs its dependencies and the exact candidate with protection in the runner default state, enables protection before the first packaged launch, and the startup gate still proves protection is on from inside the measured run.",
    "The lane performs exactly one exact-package installation and its consuming owners report separate outcomes against a verified shared preparation.",
    "A handoff that is malformed, contradicts the plan, or fails verification fails the run with one preparation outcome and installs nothing a second time."
  ],
  "archiveDigest": "67ab7633189a23e427b3e6adc2fc3f12690507708c9a9c079823189776af2397",
  "specDigest": "c76c67360debe2813b59fa967607651eeae9265e0e62251c62028d0cc4fb118b",
  "tasksDigest": "3a449eaafc10e8ac5d7d84cca5b8137d35fc845f12d4585289e0dcf52c52cabc",
  "evidenceDigest": "94b64767ce1c8b1306ce8de75d1c019f25a8b0b81b6c60e3aea8b2e1902d63ef",
  "knownGaps": []
}
```
