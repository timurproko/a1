# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A duplicate transparency-log failure retries the same validated tarball with provenance only while the exact npm version remains absent.
- Exact expected registry bytes complete publication idempotently, while mismatched bytes block every further upload.
- Unrelated npm failures and exhausted duplicate-entry retries remain failed publication outcomes.
- Installer-first ordering and final exact-pair registry verification remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "retry-transparency-log-publication",
  "sourcePr": 863,
  "archive": "openspec/changes/archive/2026-11-03-retry-transparency-log-publication/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-03-retry-transparency-log-publication/acceptance.md",
  "finalizedDate": "2026-11-03",
  "specBaseSha": "3c5a7efb4592a22cfa069c1fe59612f56ca8ff95",
  "acceptanceScenarios": [
    "A duplicate transparency-log failure retries the same validated tarball with provenance only while the exact npm version remains absent.",
    "Exact expected registry bytes complete publication idempotently, while mismatched bytes block every further upload.",
    "Unrelated npm failures and exhausted duplicate-entry retries remain failed publication outcomes.",
    "Installer-first ordering and final exact-pair registry verification remain unchanged."
  ],
  "archiveDigest": "ab918c997ae8efc97f0b3807a57d22c488fd62051fc655df64676e19d2cb831a",
  "specDigest": "694c5c89640ae3ca67f96a092c3171cbfa9e06868d345f35eb90ccd54b709b31",
  "tasksDigest": "a0766005880d82afe8e0c95423cdcf4a5af654979f1baecca15ba5fa967d96b0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
