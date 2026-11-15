# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A Windows smoke timeout settles fixture-owned updater, recovery, and npm descendants before attempting fixture removal.
- A primary update failure remains visible when settlement or removal also fails, with cleanup problems reported separately.
- Cleanup-only failures produce an unsuccessful artifact and never print the successful smoke banner.
- Publication summaries show bounded sanitized smoke-stage diagnostics without requiring a manual artifact download.
- The real public predecessor, exact candidate version, installer transcript, and promotion gates remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-windows-published-pair",
  "sourcePr": 943,
  "archive": "openspec/changes/archive/2026-11-15-fix-windows-published-pair/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-fix-windows-published-pair/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "af9d8e9fd747b0c9a72cbd214233445c63d6985d",
  "acceptanceScenarios": [
    "A Windows smoke timeout settles fixture-owned updater, recovery, and npm descendants before attempting fixture removal.",
    "A primary update failure remains visible when settlement or removal also fails, with cleanup problems reported separately.",
    "Cleanup-only failures produce an unsuccessful artifact and never print the successful smoke banner.",
    "Publication summaries show bounded sanitized smoke-stage diagnostics without requiring a manual artifact download.",
    "The real public predecessor, exact candidate version, installer transcript, and promotion gates remain unchanged."
  ],
  "archiveDigest": "63ef2069eae16ef95046e4e5751492b64b916ef59b1c79676a0af528e2416c8a",
  "specDigest": "709fa9580434887e7b4675d3ee70362ca2bc0f7fb753ff32397f1eed141681ac",
  "tasksDigest": "9534b076977739914e2b472ae35b0816d6d4c84088db7442d2587b0405e7ea91",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
