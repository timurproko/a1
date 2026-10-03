# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Apple Terminal startup uses the gap-free text logo, and system-derived themes retain the upstream chroma cap.
- Header-only quiet startup preserves the version and key hints while hiding model and resource details.
- Anthropic login supports the manual copy-code path through A1's provider-neutral workflow.
- Fullscreen defaults, leaner codemode with image generation and recovery guidance, and MCP OAuth hardening remain active through public Pi runtime APIs.
- Package-private logo animation and Radius-specific MCP mutation remain excluded without leaving orphaned, unmapped, or pending compatibility evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-0-0",
  "sourcePr": 658,
  "archive": "openspec/changes/archive/2026-10-03-pi-upgrade-1-0-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-03-pi-upgrade-1-0-0/acceptance.md",
  "finalizedDate": "2026-10-03",
  "specBaseSha": "cf5f0530324a012982081e51641dafc0ee5d143d",
  "acceptanceScenarios": [
    "Apple Terminal startup uses the gap-free text logo, and system-derived themes retain the upstream chroma cap.",
    "Header-only quiet startup preserves the version and key hints while hiding model and resource details.",
    "Anthropic login supports the manual copy-code path through A1's provider-neutral workflow.",
    "Fullscreen defaults, leaner codemode with image generation and recovery guidance, and MCP OAuth hardening remain active through public Pi runtime APIs.",
    "Package-private logo animation and Radius-specific MCP mutation remain excluded without leaving orphaned, unmapped, or pending compatibility evidence."
  ],
  "archiveDigest": "2fe89e4a23275e2d2b6a887328f763bfbc8bb7a7e991370bdd88e72dcab0d913",
  "specDigest": "9d6a60644c837c869991eb1923b710b47f88fc27bbd2e93f55dce3f7544b6e05",
  "tasksDigest": "b693f8bbb7cf01ad96d8cfaedf42122fa749fed3ac0bca595c32437bd2b5320e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
