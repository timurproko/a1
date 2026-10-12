# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Each terminal-host lane builds vendored native code for its declared target and baseline CPU rather than the hosted runner CPU.
- Unsupported target mappings fail closed, while the binary version record exposes its embedded native target and CPU policy.
- The manual proof uses the corrected executable path and identifies Pi as a native-host workload, not completed A1 resident-tab integration.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "portable-terminal-host-artifact",
  "sourcePr": 756,
  "archive": "openspec/changes/archive/2026-10-11-portable-terminal-host-artifact/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-portable-terminal-host-artifact/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "ca403347f77d34a5051a65920456d080ff2f5cea",
  "acceptanceScenarios": [
    "Each terminal-host lane builds vendored native code for its declared target and baseline CPU rather than the hosted runner CPU.",
    "Unsupported target mappings fail closed, while the binary version record exposes its embedded native target and CPU policy.",
    "The manual proof uses the corrected executable path and identifies Pi as a native-host workload, not completed A1 resident-tab integration."
  ],
  "archiveDigest": "4d070b0856a32c421f52793a0939c6bb34fa0be327ec83c40272d03308cc04b6",
  "specDigest": "06cab4fdf2bddb8cca2f7c4e26205b4d7ad061e78515bcc4b2be1deddeaf1a4a",
  "tasksDigest": "8802f72b6ac29dfe9d8d51939b0fcfeebbd7045754e4bf8fbc2bfa168931f0d9",
  "evidenceDigest": "248c9c6ace95f4d3fae805af82b3f998c412be306dbe2286e82aaac9b526b9e8",
  "knownGaps": []
}
```
