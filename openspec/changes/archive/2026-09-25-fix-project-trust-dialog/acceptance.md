# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Uncovered `ask` paths request trust even when no project resource is currently discoverable.
- Exact folder decisions do not cover unrelated siblings, while explicit ancestor and configured-default decisions retain their established scope.
- Bare A1 shows a bottom trust dialog with full-width blue rules and deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.
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
    "Bare A1 shows a bottom trust dialog with full-width blue rules and deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.",
    "Trust input and path rendering remain startup-safe, and every completion or cancellation path restores the terminal exactly once."
  ],
  "archiveDigest": "20ede933105580cd70239f7b89276c23d393595ecc19043e07c70d9ad1b452e7",
  "specDigest": "3e30ef816cacb6e4b7e5c94091668e2927d7467f39e84a0489dd21d5a7be1dd9",
  "tasksDigest": "7e20c52fa8ea701cc13543cdcdfc61c25b2333d91a961ed81a396bf589926f07",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
