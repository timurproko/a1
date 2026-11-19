# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The root README remains unchanged and its concise patch, minor, major, and exact-version commands pass semantic validation.
- Removing or corrupting runbook target, publication-order, reopening, manual-merge, or immutable-recovery guidance fails the focused governance test.
- README/runbook changes invoke the dependency-free checker in both documentation-only and changed-file CI paths; unrelated documentation is reported as not applicable.
- A lexical macOS temporary path remains the prompt heading while trust choices and persisted entries use its canonical filesystem identity.
- The reconciled head retains PR #597's fixed five-attempt cleanup bound, and both the persistent-unwritten-session and Windows NUL-cleanup runtime scenarios pass without assertion retries.
- Stable run `36388284997` remains failed pre-publication evidence; a fresh post-merge `0.2.1` run is required before any success claim.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "repair-stable-release-validation",
  "sourcePr": 609,
  "archive": "openspec/changes/archive/2026-09-28-repair-stable-release-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-repair-stable-release-validation/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "af4db31566e60cb634159b2f449d36c5091b3985",
  "acceptanceScenarios": [
    "The root README remains unchanged and its concise patch, minor, major, and exact-version commands pass semantic validation.",
    "Removing or corrupting runbook target, publication-order, reopening, manual-merge, or immutable-recovery guidance fails the focused governance test.",
    "README/runbook changes invoke the dependency-free checker in both documentation-only and changed-file CI paths; unrelated documentation is reported as not applicable.",
    "A lexical macOS temporary path remains the prompt heading while trust choices and persisted entries use its canonical filesystem identity.",
    "The reconciled head retains PR #597's fixed five-attempt cleanup bound, and both the persistent-unwritten-session and Windows NUL-cleanup runtime scenarios pass without assertion retries.",
    "Stable run `36388284997` remains failed pre-publication evidence; a fresh post-merge `0.2.1` run is required before any success claim."
  ],
  "archiveDigest": "b45875d6c3c9e431bb2f7e9bd3a71422773bdf5b9ab4221ac3106cc4322dc0c3",
  "specDigest": "885df9a33d05d2f4b4209af8d82b54791338c6866f54b75f3b487e22e0b283fd",
  "tasksDigest": "cbfa88e7a848e4aea390eaffab3f4631076c8b6649d3e23c8d717f225fb1a8c1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
