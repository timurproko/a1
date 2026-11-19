# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The engine, session-shell, owned-UI, and composition suites pass unchanged (1,342 cases): every workflow, selector, login, and admission behavior is the same through the adapter.
- Driving `PiWorkflowRunner` and `PiWorkflowContexts` directly refuses work at the shared budget, cancels pending workflows except `/quit`, and yields the same wording, clipboard acknowledgment, model cycling, login completion, and selector state.
- `adapter.ts` no longer holds workflow or selector logic; every public workflow method is a delegate and the adapter is 1,907 lines.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extract-workflows",
  "sourcePr": 484,
  "archive": "openspec/changes/archive/2026-09-18-extract-workflows/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-extract-workflows/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "39577ba147e601a4f75d634d2f090c5c184a34e7",
  "acceptanceScenarios": [
    "The engine, session-shell, owned-UI, and composition suites pass unchanged (1,342 cases): every workflow, selector, login, and admission behavior is the same through the adapter.",
    "Driving `PiWorkflowRunner` and `PiWorkflowContexts` directly refuses work at the shared budget, cancels pending workflows except `/quit`, and yields the same wording, clipboard acknowledgment, model cycling, login completion, and selector state.",
    "`adapter.ts` no longer holds workflow or selector logic; every public workflow method is a delegate and the adapter is 1,907 lines."
  ],
  "archiveDigest": "2d516e884bb3e810d6d3b7d3db8a06e72c41c8f40fcabde2192fc398da9801e8",
  "specDigest": "2952039d77c0d68d8008842ad7a7b39ed12868d97d9173aeb5bfd9707577af3f",
  "tasksDigest": "d92b1c15a13649b47c5ce8c4c4a66bd6fb584b6689c24e8407757d521ac5113f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
