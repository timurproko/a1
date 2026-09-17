# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A pull request that edits only `test/fixtures/prompt-suggestion-conversations.ts` selects the `pi` owner and its three linked integration owners, with the importing tests listed as the `shared-support` reason, instead of every owner.
- A pull request that edits an unreferenced helper under `test/support/` still selects every declared owner and records `shared-support-declared`.
- Full regression runs on its own nightly schedule with `update-performance` and `update-predecessor` executed, and ordinary pull requests list both as cadence-deferred.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "focus-pull-request-selection",
  "sourcePr": 457,
  "archive": "openspec/changes/archive/2026-09-17-focus-pull-request-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-focus-pull-request-selection/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "c17efd7b122d25007b356393ee31bac6871aa8ed",
  "acceptanceScenarios": [
    "A pull request that edits only `test/fixtures/prompt-suggestion-conversations.ts` selects the `pi` owner and its three linked integration owners, with the importing tests listed as the `shared-support` reason, instead of every owner.",
    "A pull request that edits an unreferenced helper under `test/support/` still selects every declared owner and records `shared-support-declared`.",
    "Full regression runs on its own nightly schedule with `update-performance` and `update-predecessor` executed, and ordinary pull requests list both as cadence-deferred."
  ],
  "archiveDigest": "2254ea02ff6916034318b890feb1a05a0d8d0bf15f977fde47855a516d3eb099",
  "specDigest": "dab7770ee7041ab5e203591e837638c885732631b25737b1f03bef0b59b72ecf",
  "tasksDigest": "217acd2dcc12761a784593c06e08ac7b2b7c62b33905ded0d93c742ce17a43e1",
  "evidenceDigest": "ea5a8e4d4b3bbc9eddf93556a56c0091857cf4936ff46504fc59e27b7c6de214",
  "knownGaps": []
}
```
