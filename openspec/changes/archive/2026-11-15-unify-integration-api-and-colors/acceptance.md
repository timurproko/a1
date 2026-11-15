# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Discovery returns bounded versioned JSON without interactive startup or a Core probe.
- API and Settings share color authority while profile Default and session Current remain isolated.
- Wrong-runtime, stale, expired and replaced targets cannot authorize changes to another session.
- Startup overrides retain first-frame and successful-replacement policy without persistence or tool-environment leakage.
- External Herdr workers use one packaged client, descriptor choices and native identity while preserving membership and disabled-matching guards.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-integration-api-and-colors",
  "sourcePr": 939,
  "archive": "openspec/changes/archive/2026-11-15-unify-integration-api-and-colors/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-unify-integration-api-and-colors/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "9893a86e1683942bb2efb04117f0411c8ccb63bd",
  "acceptanceScenarios": [
    "Discovery returns bounded versioned JSON without interactive startup or a Core probe.",
    "API and Settings share color authority while profile Default and session Current remain isolated.",
    "Wrong-runtime, stale, expired and replaced targets cannot authorize changes to another session.",
    "Startup overrides retain first-frame and successful-replacement policy without persistence or tool-environment leakage.",
    "External Herdr workers use one packaged client, descriptor choices and native identity while preserving membership and disabled-matching guards."
  ],
  "archiveDigest": "820a3bba02db3f5f3d7b5f43502df7acd01fd698a36100b375fd24e9275f7990",
  "specDigest": "9721cd9053a072051a1c97b4c7f3a085a3da68c10201a801c078ffb69a3dea82",
  "tasksDigest": "5271c3b9f3219c6ca4d9c0241ec31cf4ff81f56c4cb7677ac6755443cce97a56",
  "evidenceDigest": "5627b39e731ef51683a06779431b2ca5cb2f8a44805e965df125bc83886ecaff",
  "knownGaps": []
}
```
