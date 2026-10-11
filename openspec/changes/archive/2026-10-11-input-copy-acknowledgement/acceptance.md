# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Copying selected input text with `Ctrl+C` preserves the exact payload and shows one acknowledgement with its character count.
- Cutting selected input text preserves deletion and clipboard behavior without adding copy-success feedback.
- Failed or stale prompt-copy completion cannot replace newer feedback or report false success.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "input-copy-acknowledgement",
  "sourcePr": 759,
  "archive": "openspec/changes/archive/2026-10-11-input-copy-acknowledgement/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-input-copy-acknowledgement/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "fc9683845dd34ff4b8da9604acefec568feb8dca",
  "acceptanceScenarios": [
    "Copying selected input text with `Ctrl+C` preserves the exact payload and shows one acknowledgement with its character count.",
    "Cutting selected input text preserves deletion and clipboard behavior without adding copy-success feedback.",
    "Failed or stale prompt-copy completion cannot replace newer feedback or report false success."
  ],
  "archiveDigest": "e23f877cda46e36572e5c7e6a4b35d2b4da09822251f43d76c50dba2ea1b42f9",
  "specDigest": "cc86d46a0d967f46f135c1931acf481f6cb7ffeb7e7f8d1890e6bd91fa437ca4",
  "tasksDigest": "aaea177a64ddc530094903afa973bc627e3c58e00aae923514697af000e7d178",
  "evidenceDigest": "2920602f842b4a440b646ec85731d24866ffb856ee7a69b98f4d3b676d4ad4f3",
  "knownGaps": []
}
```
