# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- OSC 7501-capable terminals receive deduplicated A1 program status without exposing prompt or transcript content; aborted runs return to idle and terminal teardown emits clear.
- Extension and authentication dialogs report blocked status and restore the active run or resting state when dismissed.
- Completed and reloaded tool/shell output preserves recorded duration and Pi 1.1 output padding, including skill invocation presentation.
- Cancelled runs remain distinguishable from successful settlement through the owned event boundary.
- The feature matrix has no pending rows, inventories have no orphaned or unmapped entries, and the source ledger verifies 129 records across 29 behaviors.
- The Pi upgrade refresh passes build, ledger, inventories, public API, feature matrix, startup graph, parity generation, typecheck, architecture, engine conformance, and all 2,007 parity-suite tests.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-1-0",
  "sourcePr": 715,
  "archive": "openspec/changes/archive/2026-10-08-pi-upgrade-1-1-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-pi-upgrade-1-1-0/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "47f7419f47ee48e5ffd3297a8d86d130c7c4933b",
  "acceptanceScenarios": [
    "OSC 7501-capable terminals receive deduplicated A1 program status without exposing prompt or transcript content; aborted runs return to idle and terminal teardown emits clear.",
    "Extension and authentication dialogs report blocked status and restore the active run or resting state when dismissed.",
    "Completed and reloaded tool/shell output preserves recorded duration and Pi 1.1 output padding, including skill invocation presentation.",
    "Cancelled runs remain distinguishable from successful settlement through the owned event boundary.",
    "The feature matrix has no pending rows, inventories have no orphaned or unmapped entries, and the source ledger verifies 129 records across 29 behaviors.",
    "The Pi upgrade refresh passes build, ledger, inventories, public API, feature matrix, startup graph, parity generation, typecheck, architecture, engine conformance, and all 2,007 parity-suite tests."
  ],
  "archiveDigest": "49a2b20fb1f8ceced49486c94c86bc878b83426355674a30ed23e82f5034f8f7",
  "specDigest": "00074afa1344d93efb4c7873c19a9f9b32023cdcfb7cdd744fe87e0fe94cd230",
  "tasksDigest": "e91751145ff161167786d4a44cc49c1e750ae7d7d29240e46b65ebe17a9d7bbc",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
