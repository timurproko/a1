# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Uncovered `ask` paths request trust even when no project resource is currently discoverable.
- Exact folder decisions do not cover unrelated siblings, while explicit ancestor and configured-default decisions retain their established scope.
- Bare A1 shows a bounded bottom trust dialog with deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.
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
    "Bare A1 shows a bounded bottom trust dialog with deterministic short-terminal fallback, while `a1 pi` retains its comparison presentation.",
    "Trust input and path rendering remain startup-safe, and every completion or cancellation path restores the terminal exactly once."
  ],
  "archiveDigest": "4212a4bfebc79d456fd15a513fc74dda7eab19d27eb056d71652372eadd91140",
  "specDigest": "c05ef20c72b2da5bbac05c536a327429c5ec3ee83e16cc958aff2052d3593bf5",
  "tasksDigest": "df002a7f0aefe50e92240601de4628ecd68351cb51e7994720b8f191370cbd71",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
