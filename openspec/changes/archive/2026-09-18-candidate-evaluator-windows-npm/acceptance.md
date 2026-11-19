# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- On Windows, `evaluatePiCandidate` against the current pin reports the install, compile, and runtime stages passed, and the lockfile is unchanged afterwards.
- On Windows, `evaluatePiCandidate` against a Pi agent version that was never published reports the install stage failed with npm's `ETARGET` message rather than `spawn EINVAL`.
- `test/repository-governance/pi-candidate-evaluator.test.ts` passes its four cases unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "candidate-evaluator-windows-npm",
  "sourcePr": 491,
  "archive": "openspec/changes/archive/2026-09-18-candidate-evaluator-windows-npm/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-candidate-evaluator-windows-npm/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "e5bb79b9d00e7187d3ffc5e1a97d06141ac47b4d",
  "acceptanceScenarios": [
    "On Windows, `evaluatePiCandidate` against the current pin reports the install, compile, and runtime stages passed, and the lockfile is unchanged afterwards.",
    "On Windows, `evaluatePiCandidate` against a Pi agent version that was never published reports the install stage failed with npm's `ETARGET` message rather than `spawn EINVAL`.",
    "`test/repository-governance/pi-candidate-evaluator.test.ts` passes its four cases unchanged."
  ],
  "archiveDigest": "c4e20f8d34b669691edad8c72476e919bcdf3f39f52ff460d9ef4adb7216a5b4",
  "specDigest": "5f7a6520f8e850c5930d20bc564e38dd008334a8788e56d6e5b2d6a9f1e43ae0",
  "tasksDigest": "8fec0d26ed6fc18c4276e88f35170b06f7539abace25e9310bc4861e09335eca",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
