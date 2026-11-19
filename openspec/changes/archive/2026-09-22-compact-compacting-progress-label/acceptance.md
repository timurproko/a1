# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 renders measured compaction progress as `Compacting(n%)...` without a gap for values from 0 through 99.
- Missing progress and the pinned `a1 pi` route continue showing `Compacting...` without a percentage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "compact-compacting-progress-label",
  "sourcePr": 553,
  "archive": "openspec/changes/archive/2026-09-22-compact-compacting-progress-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-compact-compacting-progress-label/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "f7df7624f9ae75f76b9cc55714ad42d7fca23a7c",
  "acceptanceScenarios": [
    "Bare A1 renders measured compaction progress as `Compacting(n%)...` without a gap for values from 0 through 99.",
    "Missing progress and the pinned `a1 pi` route continue showing `Compacting...` without a percentage."
  ],
  "archiveDigest": "30d8675317f7241f88ccfdc03665502f03246585798861952fe660307466ee53",
  "specDigest": "0298c0332196035674e0932bb75fdc1bb07c6ef72a87a36e6cf0fd395dff3abf",
  "tasksDigest": "8e14ee00d5e6a7ac43091891020199d58b7814bec41b9bba4713ea1afdec5a47",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
