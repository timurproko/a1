# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Draft pull-request changes schedule no Development test suite, including selected Full regression.
- Ready version-3 changes defer tests until finalization records both delivery paths.
- Only eligible heads expose the protected `Development validation required` aggregate name.
- Ordinary ready pull requests and manual dispatch retain their existing selected validation.
- Malformed lifecycle metadata fails before pull-request code or dependencies execute.
- Eligible validation retains all existing owners, native lanes, evidence, cancellation, and failure semantics.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "defer-draft-pr-validation",
  "sourcePr": 571,
  "archive": "openspec/changes/archive/2026-09-23-defer-draft-pr-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-defer-draft-pr-validation/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "c66d6d13969b9beff48a8ea92f7d96cc79d84f27",
  "acceptanceScenarios": [
    "Draft pull-request changes schedule no Development test suite, including selected Full regression.",
    "Ready version-3 changes defer tests until finalization records both delivery paths.",
    "Only eligible heads expose the protected `Development validation required` aggregate name.",
    "Ordinary ready pull requests and manual dispatch retain their existing selected validation.",
    "Malformed lifecycle metadata fails before pull-request code or dependencies execute.",
    "Eligible validation retains all existing owners, native lanes, evidence, cancellation, and failure semantics."
  ],
  "archiveDigest": "b39e5baec5a38553ab669ae599a3489dc6a6e69583e59418e5edb11ada8c598e",
  "specDigest": "e900bab5790a1444ee57970e881902e593cfc228862f247695b54d1aa3e2e8ec",
  "tasksDigest": "01568b15dbb1fa3cb44e6ccd052fe53a4569309bfae64cdcbc66b22a9387703c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
