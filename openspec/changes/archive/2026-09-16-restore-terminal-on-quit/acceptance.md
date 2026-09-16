# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/quit` and double `Ctrl+C` restore the terminal and return control to the parent shell without extra input.
- Concurrent quit requests complete one full shutdown while preserving configured exit output.
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
    "Concurrent quit requests complete one full shutdown while preserving configured exit output.",
    "Quit autocomplete presents `Quit` without a product qualifier."
  ],
  "archiveDigest": "5a504b9a9270588dd6fbe3ca8b75366d3905c287844c45d6722491573ceafdf7",
  "specDigest": "364b8fdef71500e35b583674ac4f83b298667ed9578d12b5fff826171dc947cc",
  "tasksDigest": "16b2a40b54b73cd8df96bf4ba260c83da51e10cc8d0dda829a8d1923d9e19b11",
  "evidenceDigest": "10fc7f74fd6da8216ba678c2caf193b1b070987d626c7bfbc264b22dfba85070",
  "knownGaps": []
}
```
