# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pinned both Pi packages at 0.99.1 and refreshed the source ledger, inventories, public API baseline, feature matrix, startup graph, changelog, and parity evidence.
- Resolved both vendored conflicts and all orphaned or unmapped inventory findings; the final refresh reports none remaining.
- Reviewed all changed consumed public exports and dispositioned every new feature row, with package-root typecheck, conformance, settings, session, component, and command parity coverage.
- Adopted the 0.99.1 logo and palettes, fullscreen wheel-scroll setting, virtual-model route footer, tool fallback rendering, model catalog, and authentication updates.
- Passed every upgrade-refresh gate and the repository fast validation suite, including resource-sensitive tests.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-99-1",
  "sourcePr": 642,
  "archive": "openspec/changes/archive/2026-10-01-pi-upgrade-0-99-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-pi-upgrade-0-99-1/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "94ae1979adc16c14f6eb3a124a43ec6d87963f1f",
  "acceptanceScenarios": [
    "Pinned both Pi packages at 0.99.1 and refreshed the source ledger, inventories, public API baseline, feature matrix, startup graph, changelog, and parity evidence.",
    "Resolved both vendored conflicts and all orphaned or unmapped inventory findings; the final refresh reports none remaining.",
    "Reviewed all changed consumed public exports and dispositioned every new feature row, with package-root typecheck, conformance, settings, session, component, and command parity coverage.",
    "Adopted the 0.99.1 logo and palettes, fullscreen wheel-scroll setting, virtual-model route footer, tool fallback rendering, model catalog, and authentication updates.",
    "Passed every upgrade-refresh gate and the repository fast validation suite, including resource-sensitive tests."
  ],
  "archiveDigest": "a1a1cc3116cdb833bcbdc7fe7d70c92f8f879aeef61f312ddc7b18dda9dbad38",
  "specDigest": "1dded232493d6ba6de8eb0c9c46c70849bb60dc21af8f7a5e2ebc42d34d497de",
  "tasksDigest": "e71173eccd1dc2221336012f0c551f48b1aa95d4a3aac84899cfd07b41755f4f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
