# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Full regression runs core, resource, rendering, and package shards concurrently on separate runners for both Windows Node 22 and Node 24, while Linux and macOS keep one complete job.
- Every canonical full-release command and test invocation runs in exactly one Windows shard, and the shard union equals the unsharded plan.
- Resource-sensitive and rendering tests stay serial inside their own shard with unchanged timeouts, and no shard retries a failure.
- Only the package shard packs and installs the candidate, enables Defender before first-attempt startup, runs startup before package contracts, and runs the published-predecessor test once.
- Each Windows lane is rebuilt only when all four current-run shards for the same source, runtime, plan, and attempt pass with exactly their assigned work.
- A missing, duplicate, stale, cross-runtime, wrong-plan, failed, or cancelled shard produces no Windows lane and fails the four-lane aggregate.
- Nightly triage reports a failed shard's owners under its canonical Windows lane with the shard job named, and rejects duplicate startup evidence for a lane.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "parallelize-windows-full-regression",
  "sourcePr": 630,
  "archive": "openspec/changes/archive/2026-09-29-parallelize-windows-full-regression/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-parallelize-windows-full-regression/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "dd9d9ae35d8f3d492fa6d5b2f080e57fd9f51271",
  "acceptanceScenarios": [
    "Full regression runs core, resource, rendering, and package shards concurrently on separate runners for both Windows Node 22 and Node 24, while Linux and macOS keep one complete job.",
    "Every canonical full-release command and test invocation runs in exactly one Windows shard, and the shard union equals the unsharded plan.",
    "Resource-sensitive and rendering tests stay serial inside their own shard with unchanged timeouts, and no shard retries a failure.",
    "Only the package shard packs and installs the candidate, enables Defender before first-attempt startup, runs startup before package contracts, and runs the published-predecessor test once.",
    "Each Windows lane is rebuilt only when all four current-run shards for the same source, runtime, plan, and attempt pass with exactly their assigned work.",
    "A missing, duplicate, stale, cross-runtime, wrong-plan, failed, or cancelled shard produces no Windows lane and fails the four-lane aggregate.",
    "Nightly triage reports a failed shard's owners under its canonical Windows lane with the shard job named, and rejects duplicate startup evidence for a lane."
  ],
  "archiveDigest": "847274992ce82a0ca16969042fe529ec73635909659f76d16c958fdb25a96c0f",
  "specDigest": "d98b6a29f31bfaef27be7c0238fbc2ce0dbf7a749dc9fbc039b39da0eef036b4",
  "tasksDigest": "161bb8dd9f1ea523f41df3109617937d6df5d732ffd229147593e14fb0d0f4fc",
  "evidenceDigest": "82502cac9ba9fddb6dc745ad6a7f494e6cba50ae60ea8e160c9f1d76336d6636",
  "knownGaps": []
}
```
