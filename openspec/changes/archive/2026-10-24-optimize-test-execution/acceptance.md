# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ordinary pull requests select mandatory and owner-critical tests plus changed and bounded transitive consumers instead of complete owner populations.
- Expensive package, compatibility, native, chaos, rendering, and platform work runs only for directly affected surfaces; exhaustive owners remain deferred.
- Full, nightly, and release workflows retain complete declared coverage, including smoke assertions through their executed replacements.
- A decisive Development failure cancels remaining matrix work, and cancelled or missing selected evidence still blocks the aggregate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "optimize-test-execution",
  "sourcePr": 833,
  "archive": "openspec/changes/archive/2026-10-24-optimize-test-execution/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-optimize-test-execution/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "8e6a828eed4a3d64132cbc9134f42f4f6bfee265",
  "acceptanceScenarios": [
    "Ordinary pull requests select mandatory and owner-critical tests plus changed and bounded transitive consumers instead of complete owner populations.",
    "Expensive package, compatibility, native, chaos, rendering, and platform work runs only for directly affected surfaces; exhaustive owners remain deferred.",
    "Full, nightly, and release workflows retain complete declared coverage, including smoke assertions through their executed replacements.",
    "A decisive Development failure cancels remaining matrix work, and cancelled or missing selected evidence still blocks the aggregate."
  ],
  "archiveDigest": "080d875b75ebad7832e9cf20c2f342ffcc3c3fe3b4c0055dbf18d12a00015b69",
  "specDigest": "6cdffea656e8cbdc3fba61e6b81500baf05c273a67b6507228c5d730e821dbaf",
  "tasksDigest": "134b98a39edc81eaff136d6314ead4f4a8ccef22e35d4778507ed43e9a272d27",
  "evidenceDigest": "417287237c9c717df829fff91a389fe395229feb812b0e8e7567e8e2b91b73e9",
  "knownGaps": []
}
```
