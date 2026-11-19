# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The twelve modules and their six unit tests are gone, every barrel and registry that named them is updated, and typecheck plus the affected suites pass.
- The module-graph gate treats a type-only module as reachable through type imports and accepts `engine/conformance.ts` as a declared entry with no importer.
- `config/architecture-allowlist.json` lists 16 unreachable modules: the workspace subsystem and `tui-runtime/conformance.ts`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "delete-dead-modules",
  "sourcePr": 474,
  "archive": "openspec/changes/archive/2026-09-18-delete-dead-modules/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-delete-dead-modules/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "d35a3053af0dc9fe196e173b1b625aadf85d846f",
  "acceptanceScenarios": [
    "The twelve modules and their six unit tests are gone, every barrel and registry that named them is updated, and typecheck plus the affected suites pass.",
    "The module-graph gate treats a type-only module as reachable through type imports and accepts `engine/conformance.ts` as a declared entry with no importer.",
    "`config/architecture-allowlist.json` lists 16 unreachable modules: the workspace subsystem and `tui-runtime/conformance.ts`."
  ],
  "archiveDigest": "c44dcf322af82f0d0eab9e15adad2a71b252e62d3591d3c1e680ae34a1ccb833",
  "specDigest": "82f3ce01e078269b55578d65c1374c903c033ad04bfac36d218ec88b75b7b50b",
  "tasksDigest": "bc4e84d95a22dd59c9f8b72a16348d4d164e6e6f5f5ea39edfc4aaf3d5d16534",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
