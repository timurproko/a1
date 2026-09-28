# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Uncovered `ask` paths request trust even when no project resource is currently discoverable.
- Exact folder decisions do not cover unrelated siblings, while explicit ancestor and configured-default decisions retain their established scope.
- Bare A1 shows a bottom trust dialog with full-width blue rules, the exact product-neutral explanation, and deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.
- Trust input and path rendering remain startup-safe, and every completion or cancellation path restores the terminal exactly once.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-project-trust-dialog",
  "sourcePr": 590,
  "archive": "openspec/changes/archive/2026-09-25-fix-project-trust-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-fix-project-trust-dialog/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "686ba14368d36f3be1c8c4c46bc20d7a5266c0b5",
  "acceptanceScenarios": [
    "Uncovered `ask` paths request trust even when no project resource is currently discoverable.",
    "Exact folder decisions do not cover unrelated siblings, while explicit ancestor and configured-default decisions retain their established scope.",
    "Bare A1 shows a bottom trust dialog with full-width blue rules, the exact product-neutral explanation, and deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.",
    "Trust input and path rendering remain startup-safe, and every completion or cancellation path restores the terminal exactly once."
  ],
  "archiveDigest": "ba90b2e836d03e2d6e0bdfdfd78f8bce0d8a9456d7738f2ab38f710e6f4cb8d2",
  "specDigest": "a75b17ee864e57e196d2202bdfab09639867d90172c6998f93e9c06b832670e5",
  "tasksDigest": "b03b3415f85f919228f9e0c03335385fa219fbd1d503b66b7a41335d28743637",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
