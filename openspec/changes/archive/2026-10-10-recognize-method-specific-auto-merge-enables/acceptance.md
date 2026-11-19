# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Enabling squash auto-merge on a finalized implementation PR keeps it enabled instead of the policy workflow disabling it.
- A manual merge after policy-disarmed squash enables, like #742, verifies as manual integration.
- Bot-enabled, stale, and legacy acceptance arms are still refused.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "recognize-method-specific-auto-merge-enables",
  "sourcePr": 743,
  "archive": "openspec/changes/archive/2026-10-10-recognize-method-specific-auto-merge-enables/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-recognize-method-specific-auto-merge-enables/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "16f7c15d62aa7755f0381fc8a1d72885dc0cd232",
  "acceptanceScenarios": [
    "Enabling squash auto-merge on a finalized implementation PR keeps it enabled instead of the policy workflow disabling it.",
    "A manual merge after policy-disarmed squash enables, like #742, verifies as manual integration.",
    "Bot-enabled, stale, and legacy acceptance arms are still refused."
  ],
  "archiveDigest": "412d2305248fa1389ec46f52cff1cd4a7ef38b3438b356aefbafff968fc9ccd6",
  "specDigest": "ccb962e81fbb022a248c1afd223ee93912ab710e4858f597d7cba8d4b804bd1b",
  "tasksDigest": "c902f3ff0d149482b9440d873bec8d574127b19293a4f619894e07b95dab90f8",
  "evidenceDigest": "7cbb1f2229f4d7491724a12b711a00e4aa8c157c846ad1b32490c183ca79ed99",
  "knownGaps": []
}
```
