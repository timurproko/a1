# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Candidate and nightly validation reconstruct each Windows Node 22 and Node 24 lane only after its core, resource, rendering, and package shards pass.
- Development preview validation retains its three sequential Node 24 platform lanes without scheduling Windows shards.
- Published-predecessor validation uses one authenticated candidate installation and one immediate-predecessor installation while retaining all three recent predecessors and the separate 0.2.2 bridge.
- Missing, stale, malformed, cross-runtime, wrong-plan, cancelled, or failed Windows shard evidence prevents publication validation from passing.
- Linux and macOS validation remain sequential, final stable publication adopts candidate-validated bytes, and published-pair smoke retains every platform lane.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "optimize-windows-release-validation",
  "sourcePr": 705,
  "archive": "openspec/changes/archive/2026-10-07-optimize-windows-release-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-optimize-windows-release-validation/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "852ba46d8ea5b99513b595877c3770f9ae76d21e",
  "acceptanceScenarios": [
    "Candidate and nightly validation reconstruct each Windows Node 22 and Node 24 lane only after its core, resource, rendering, and package shards pass.",
    "Development preview validation retains its three sequential Node 24 platform lanes without scheduling Windows shards.",
    "Published-predecessor validation uses one authenticated candidate installation and one immediate-predecessor installation while retaining all three recent predecessors and the separate 0.2.2 bridge.",
    "Missing, stale, malformed, cross-runtime, wrong-plan, cancelled, or failed Windows shard evidence prevents publication validation from passing.",
    "Linux and macOS validation remain sequential, final stable publication adopts candidate-validated bytes, and published-pair smoke retains every platform lane."
  ],
  "archiveDigest": "1c73dc3bfa11a95fd3fca6e2001cb4e09587511c225e6843a238399b3ccf5678",
  "specDigest": "c0915c52673bc95bf25425b9b7f6c58be830c879033c8208d3da254c6b227773",
  "tasksDigest": "ca9e7d5d7bd83accfd00edcb400bcbe4e002db4cf8566715d0623f7819267aa9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
