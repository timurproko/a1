# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A fully checked draft whose Implementation item asks to validate or manually test work stays draft with the implementation-progress-validation reason.
- Merged pull request bodies written under the earlier wording still verify after merge.
- Agent guidance tells agents to check an item once its code and tests are written, without waiting for CI or manual validation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "implementation-only-progress",
  "sourcePr": 784,
  "archive": "openspec/changes/archive/2026-10-16-implementation-only-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-implementation-only-progress/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "e61958fc995e4e680d49b5fbd0de3a3c838f0b21",
  "acceptanceScenarios": [
    "A fully checked draft whose Implementation item asks to validate or manually test work stays draft with the implementation-progress-validation reason.",
    "Merged pull request bodies written under the earlier wording still verify after merge.",
    "Agent guidance tells agents to check an item once its code and tests are written, without waiting for CI or manual validation."
  ],
  "archiveDigest": "6102aa1bdfb0650cae2b3c4bf825cf4bf52165c3fef2cd36ea9c1dc82f56d8c6",
  "specDigest": "33f3e1a985f170c07c108b50b073cff76423616b4cd4f989e47162290b4f3a94",
  "tasksDigest": "a60e718f4cbd526c2e08c065e76b65b2df7bf1ec9499751a5acc36810e5e32b5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
