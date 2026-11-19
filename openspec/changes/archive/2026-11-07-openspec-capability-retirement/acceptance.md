# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A change that declares retire_capabilities and removes every requirement of a capability finalizes, and its spec digest leaves that capability out.
- Post-merge verification of that delivery succeeds from the repository tree without the retired spec.
- A missing spec for a capability the change does not retire still blocks finalization and post-merge verification.
- Deliveries that retire nothing finalize and verify exactly as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "openspec-capability-retirement",
  "sourcePr": 880,
  "archive": "openspec/changes/archive/2026-11-07-openspec-capability-retirement/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-07-openspec-capability-retirement/acceptance.md",
  "finalizedDate": "2026-11-07",
  "specBaseSha": "9f0307c00ea0b83cfd4aea196543ddb7738fc6ee",
  "acceptanceScenarios": [
    "A change that declares retire_capabilities and removes every requirement of a capability finalizes, and its spec digest leaves that capability out.",
    "Post-merge verification of that delivery succeeds from the repository tree without the retired spec.",
    "A missing spec for a capability the change does not retire still blocks finalization and post-merge verification.",
    "Deliveries that retire nothing finalize and verify exactly as before."
  ],
  "archiveDigest": "0f9125d17251e044eeb753a2bf6577a591200a3fdd9bac4bb3aa08a4bc291b87",
  "specDigest": "a5a4fb73e9cec93cd64da77c0beea569cf5696281bc1e18e4e3400f8e42a982c",
  "tasksDigest": "1cafaaba53cf4de74a4e1400ee34fc2e005b01940840686bddbb8b766fc5b0d5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
