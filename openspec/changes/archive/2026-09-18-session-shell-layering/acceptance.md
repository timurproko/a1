# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run check:architecture` passes with `src/app/session-shell` declared as the `session-shell` owner, no `export *` in any owner `index.ts`, and the startup graph at 153 files and 1,443,318 bytes.
- The policy suite proves `export *` rejection, composition-only and startup-leaf deep imports, and the three layer boundaries; the impact suite proves a 300-file rename classifies with a bounded recorded path list.
- The moved `test/app/session-shell` suites and the repository-governance, contract, composition, feature, integration, UI, and CLI suites pass.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-shell-layering",
  "sourcePr": 495,
  "archive": "openspec/changes/archive/2026-09-18-session-shell-layering/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-session-shell-layering/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "17e62b91e18f1a0f4b6fd67653f142ff2ba4683f",
  "acceptanceScenarios": [
    "`npm run check:architecture` passes with `src/app/session-shell` declared as the `session-shell` owner, no `export *` in any owner `index.ts`, and the startup graph at 153 files and 1,443,318 bytes.",
    "The policy suite proves `export *` rejection, composition-only and startup-leaf deep imports, and the three layer boundaries; the impact suite proves a 300-file rename classifies with a bounded recorded path list.",
    "The moved `test/app/session-shell` suites and the repository-governance, contract, composition, feature, integration, UI, and CLI suites pass."
  ],
  "archiveDigest": "5996b0cdfa1b2ca8a6d3911651c7f37f8989200917f0bb3a72f0f4ec7fb58ce2",
  "specDigest": "53f71d002038f89598815024c8cb61101d1d0e35c683393e67c35b0be36e97c6",
  "tasksDigest": "a7ffb94670b27ccf43514283690e1dc18b80f07edb3f24c0de352a3afc1ae6c6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
