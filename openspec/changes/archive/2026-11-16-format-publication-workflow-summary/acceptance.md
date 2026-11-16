# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A successful publication workflow shows one blank line after the job list, then the unindented bracketed workflow summary.
- The develop publication result retains its existing format directly below the workflow summary without an extra blank line.
- Interactive job updates and counters, registry verification, failures, and cancellation retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "format-publication-workflow-summary",
  "sourcePr": 958,
  "archive": "openspec/changes/archive/2026-11-16-format-publication-workflow-summary/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-format-publication-workflow-summary/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "1b04aa608175af6539087074bdd8868a8670e30b",
  "acceptanceScenarios": [
    "A successful publication workflow shows one blank line after the job list, then the unindented bracketed workflow summary.",
    "The develop publication result retains its existing format directly below the workflow summary without an extra blank line.",
    "Interactive job updates and counters, registry verification, failures, and cancellation retain their existing behavior."
  ],
  "archiveDigest": "96d2df284045dc330c4f0b578f3f8f7a0379c2042ad4bc756f0b9c04e4deeaaf",
  "specDigest": "1a98fa8758176451cfeb84991c05873215386d63be41b8932007021d8b41daa1",
  "tasksDigest": "e5601922c77984861a22a4c979e27cd1f17fb06236345f5160e162577f4d036e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
