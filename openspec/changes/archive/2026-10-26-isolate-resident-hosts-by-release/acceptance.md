# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- New launches use only their immutable release's host while existing releases continue independently without migration or interruption.
- Recovery and child launches retain originating release custody, and release-local maintenance cannot stop another cohort.
- Release collection conservatively retains live, legacy and unverifiable resident artifacts.
- Shared sessions retain one process-owned writer across all release namespaces without automatic takeover or prompt replay.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "isolate-resident-hosts-by-release",
  "sourcePr": 835,
  "archive": "openspec/changes/archive/2026-10-26-isolate-resident-hosts-by-release/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-isolate-resident-hosts-by-release/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "fa24f0d0f0da2138535029b10fd84432915bf130",
  "acceptanceScenarios": [
    "New launches use only their immutable release's host while existing releases continue independently without migration or interruption.",
    "Recovery and child launches retain originating release custody, and release-local maintenance cannot stop another cohort.",
    "Release collection conservatively retains live, legacy and unverifiable resident artifacts.",
    "Shared sessions retain one process-owned writer across all release namespaces without automatic takeover or prompt replay."
  ],
  "archiveDigest": "b733fe96d7216a9455b6314e6cfa2e58445335993e188c86ddeeb44c125049eb",
  "specDigest": "60aefd8fa6c18de9215cf638080c0ed93a3aa3c49447fdb775f97931c59ad91f",
  "tasksDigest": "9c4be3745d6314c3ead29c1bd0f2ac925e14d18cbefb323dfad5d0f26475ab74",
  "evidenceDigest": "41c279d055f5dd1e3ddb7abd8192e94eb3218424e04a170d3e3d28cd4a34fd97",
  "knownGaps": []
}
```
