# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A canonical repository-local GitHub origin remains discoverable when `url.*.insteadOf` rewrites its effective transport to an account-specific SSH alias.
- Cleanup derives the same `owner/repository` identity while normal Git operations retain the configured transport and credential routing.
- Literal non-GitHub aliases, malformed or empty origins, and multiple repository-local origin values block before candidate evaluation or mutation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "support-cleanup-origin-rewrites",
  "sourcePr": 673,
  "archive": "openspec/changes/archive/2026-10-05-support-cleanup-origin-rewrites/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-support-cleanup-origin-rewrites/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "0f3d3c77cc93664e056b5c6bf56d1574388a6f7e",
  "acceptanceScenarios": [
    "A canonical repository-local GitHub origin remains discoverable when `url.*.insteadOf` rewrites its effective transport to an account-specific SSH alias.",
    "Cleanup derives the same `owner/repository` identity while normal Git operations retain the configured transport and credential routing.",
    "Literal non-GitHub aliases, malformed or empty origins, and multiple repository-local origin values block before candidate evaluation or mutation."
  ],
  "archiveDigest": "e4aa7e0afb9af4feb926760c257c5f650d42138fd22b314e8eb4204a91c3689d",
  "specDigest": "50bf1ac30cd682720ef312625bbf8aff49f923d28efba8db8414e32a0d5fc019",
  "tasksDigest": "ec6d41b1b949e4d8c55ce9981b2ef3e102efb4a487b4f71155560a25bd1a8bf0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
