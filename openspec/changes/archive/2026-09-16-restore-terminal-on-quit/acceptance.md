# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/quit` and double `Ctrl+C` restore the terminal and return control to the parent shell without extra input.
- Quit completes after owned cleanup even when an extension retains an event-loop handle, while configured exit output remains intact.
- Quit autocomplete presents `Quit` without a product qualifier.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-terminal-on-quit",
  "sourcePr": 430,
  "archive": "openspec/changes/archive/2026-09-16-restore-terminal-on-quit/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-restore-terminal-on-quit/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "a4304c22c8d613b587195f50ca19ec0429ddbb97",
  "acceptanceScenarios": [
    "`/quit` and double `Ctrl+C` restore the terminal and return control to the parent shell without extra input.",
    "Quit completes after owned cleanup even when an extension retains an event-loop handle, while configured exit output remains intact.",
    "Quit autocomplete presents `Quit` without a product qualifier."
  ],
  "archiveDigest": "1fe28d97eee66a8e7eb71c0a23618f059469d3893382af384b3cc57f0d35a16e",
  "specDigest": "4435d8b18179b525423b2cd4883b30f3a94c10148a6b503323cde90ea0bdb8fe",
  "tasksDigest": "ac040a72cccf5a1a2a98a1d26ccb26aa48c049b9255a9685437f475b03c90c42",
  "evidenceDigest": "80b44d00a5e6ddae1ce10bc4da9d44d1013f0c5c084c21dd87f09e464067060b",
  "knownGaps": []
}
```
