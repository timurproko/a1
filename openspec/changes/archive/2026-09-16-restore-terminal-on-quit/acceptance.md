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
  "specBaseSha": "94075aef090d324b3b596e175516d677483cca10",
  "acceptanceScenarios": [
    "`/quit` and double `Ctrl+C` restore the terminal and return control to the parent shell without extra input.",
    "Quit completes after owned cleanup even when an extension retains an event-loop handle, while configured exit output remains intact.",
    "Quit autocomplete presents `Quit` without a product qualifier."
  ],
  "archiveDigest": "b7910c6408f56fbdf0cc5465b2e71e75a37a3f50039160f016b59cef78d43a6c",
  "specDigest": "4435d8b18179b525423b2cd4883b30f3a94c10148a6b503323cde90ea0bdb8fe",
  "tasksDigest": "ac040a72cccf5a1a2a98a1d26ccb26aa48c049b9255a9685437f475b03c90c42",
  "evidenceDigest": "dabced2915bc3ffbd5976d980c6d023a5b2f6434d2c7a20f43f4675e979b8f76",
  "knownGaps": []
}
```
