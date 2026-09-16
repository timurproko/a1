# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Installed A1 and Pi launches reach input-ready within the 2.0/2.5-second first-attempt budgets while respecting independent eager-graph limits.
- The public Pi startup artifact preserves providers, extensions, settings, resources, and one Pi TUI identity without private distribution imports.
- Interactive launch and update warmup use one certified startup descriptor while optional settings and history presentation remain on demand.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "reduce-ui-startup-module-graph",
  "sourcePr": 436,
  "archive": "openspec/changes/archive/2026-09-16-reduce-ui-startup-module-graph/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-reduce-ui-startup-module-graph/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "5ba547a0d571d2a67a5aab6bcb81277186aa4ef4",
  "acceptanceScenarios": [
    "Installed A1 and Pi launches reach input-ready within the 2.0/2.5-second first-attempt budgets while respecting independent eager-graph limits.",
    "The public Pi startup artifact preserves providers, extensions, settings, resources, and one Pi TUI identity without private distribution imports.",
    "Interactive launch and update warmup use one certified startup descriptor while optional settings and history presentation remain on demand."
  ],
  "archiveDigest": "5ba2cb2ea90100183b3c7f2ffcda2f24d9e2d048b1543c087c9f8af0c43e4431",
  "specDigest": "2452391909c1e19a4f6704b064b60da1a674be439317a03e204f0198cd38321f",
  "tasksDigest": "b42eac0582f0f10223b373d35098c57d1f2debc0fda1f123778aef949b6afa23",
  "evidenceDigest": "dd790f6b1acac1ea21b8439808b159e82c80a6d9df137ba8861cf5b53c4dc9d2",
  "knownGaps": [
    "Historical package module-census, release-id, and dependency-layer-id fields were not emitted and cannot be reconstructed; exact package digest, lane, topology, timing, and failing phases are retained.",
    "No independently packaged A1-only intermediate timing candidate exists because leaf-import and Pi-artifact changes were developed together; deterministic reachability and final exact-package evidence cover the outcome.",
    "Hosted exact-head Node 22 and Node 24 evidence runs only after finalized PR readiness and remains required before manual merge.",
    "Authoritative development preview publication runs from develop only after manual merge and remains a post-merge operational outcome."
  ]
}
```
