# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/quit` and double `Ctrl+C` restore the terminal and return control without extra input or a visible repository-local post-restoration pause.
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
  "specBaseSha": "ffd499d40fb1f7824e396c0c2464c514927bd0a2",
  "acceptanceScenarios": [
    "`/quit` and double `Ctrl+C` restore the terminal and return control without extra input or a visible repository-local post-restoration pause.",
    "Quit completes after owned cleanup even when an extension retains an event-loop handle, while configured exit output remains intact.",
    "Quit autocomplete presents `Quit` without a product qualifier."
  ],
  "archiveDigest": "3ddd2f75dd73d807bbd0ed341d98ea6da276499fc7b5123e295fa7b0a840cf2d",
  "specDigest": "e0fbfc9d4cbb7f1ee814ad1966691a832f6ae830116cb2d52ea9e3c361332bfc",
  "tasksDigest": "894d01c44e8ce3e8c2cfaede7a6138f633f0e8fb2d920dcb641e323ed1125d2c",
  "evidenceDigest": "de0c2304550dc056773f016cc573d88f11a25e3db185a8b6bc0f219521ff6ad3",
  "knownGaps": []
}
```
