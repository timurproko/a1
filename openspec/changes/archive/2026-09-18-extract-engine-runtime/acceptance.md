# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The engine, session-shell, owned-UI, and composition suites pass unchanged (1,350 cases): startup, binding, events, commands, settings, resources, suggestions, and extension binding behave as before through the adapter.
- Each component driven directly with fake sessions, runtimes, and ports yields the same generations, outcomes, work-state transitions, snapshots, resource summaries, suggestions, bindings, and wording.
- `adapter.ts` is 790 lines and no engine module exceeds 600; the adapter owns only view, editor, status, lifecycle, model state, `#perform`, and overload reconciliation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extract-engine-runtime",
  "sourcePr": 485,
  "archive": "openspec/changes/archive/2026-09-18-extract-engine-runtime/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-extract-engine-runtime/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "b163a0fa3752b3cf363b3234ca3f92b51e436997",
  "acceptanceScenarios": [
    "The engine, session-shell, owned-UI, and composition suites pass unchanged (1,350 cases): startup, binding, events, commands, settings, resources, suggestions, and extension binding behave as before through the adapter.",
    "Each component driven directly with fake sessions, runtimes, and ports yields the same generations, outcomes, work-state transitions, snapshots, resource summaries, suggestions, bindings, and wording.",
    "`adapter.ts` is 790 lines and no engine module exceeds 600; the adapter owns only view, editor, status, lifecycle, model state, `#perform`, and overload reconciliation."
  ],
  "archiveDigest": "78cce938923e48dfa2e081b33d34a7b20fbae1b39e5aa780b71cc36542749666",
  "specDigest": "48a84c4a99704cb28cfcf3413e24ba0e728767fcc5be8576220fc345bb14458a",
  "tasksDigest": "95306df876172c579a660fe537bf8aef8b9aa051c8e08267af46e338a04ede99",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
