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
  "specBaseSha": "251564e2db19a68af4d6ae5e1cc81c10f0d3455d",
  "acceptanceScenarios": [
    "Uncovered `ask` paths request trust even when no project resource is currently discoverable.",
    "Exact folder decisions do not cover unrelated siblings, while explicit ancestor and configured-default decisions retain their established scope.",
    "Bare A1 shows a bottom trust dialog with full-width blue rules, the exact product-neutral explanation, and deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.",
    "Trust input and path rendering remain startup-safe, and every completion or cancellation path restores the terminal exactly once."
  ],
  "archiveDigest": "27ab413af9603c3264fe68f06965c966af57a39dd708b3f7c343524c2d91950d",
  "specDigest": "f95feac6f736ff08220083da74458bb9a7c7bff0dbbe9cb37943306151ecb791",
  "tasksDigest": "fcdca91bac6218de02c706c250c75a40dc6a340f48db2e064dbae524ee8ef108",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
