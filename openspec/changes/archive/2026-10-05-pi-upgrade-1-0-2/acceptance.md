# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Extension renderers now present resumed and MCP-style tools even when no tool definition is registered; built-in renderers and asynchronous updates remain intact.
- Pi-owned sampling overrides, MCP project overrides/CIMD support, and Cloudflare classifiers remain available through the pinned runtime; the upstream Nix distribution path is intentionally not adopted.
- Package resolution supports both nested and npm-deduplicated Pi dependencies without exposing package-private imports.
- The resolved inventories contain no orphaned or unmapped entries, the feature matrix has no pending rows, and the source ledger records 127 verified records across 29 behaviors.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-0-2",
  "sourcePr": 669,
  "archive": "openspec/changes/archive/2026-10-05-pi-upgrade-1-0-2/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-pi-upgrade-1-0-2/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "73f00bab51efe27ad906d2eeed968414361f0e98",
  "acceptanceScenarios": [
    "Extension renderers now present resumed and MCP-style tools even when no tool definition is registered; built-in renderers and asynchronous updates remain intact.",
    "Pi-owned sampling overrides, MCP project overrides/CIMD support, and Cloudflare classifiers remain available through the pinned runtime; the upstream Nix distribution path is intentionally not adopted.",
    "Package resolution supports both nested and npm-deduplicated Pi dependencies without exposing package-private imports.",
    "The resolved inventories contain no orphaned or unmapped entries, the feature matrix has no pending rows, and the source ledger records 127 verified records across 29 behaviors."
  ],
  "archiveDigest": "03e895d3ae8334a10775c95f66af57e1e48ff8c71c060fcb68b35f023cbe2a96",
  "specDigest": "1c3ade9a43d3c1093e7444e463179b5373f463d6b3c62d62cbb886af8d3218e4",
  "tasksDigest": "fbcd2f34bf3d214ee83ef3e237042538298983b191491ff8ed7886033a692446",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
