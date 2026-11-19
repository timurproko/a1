# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Successful catalog refresh keeps `(refreshing)` visible for the one-second minimum, then removes the suffix directly without showing `(refreshed)` or a success sentence.
- Refreshed models preserve the query, surviving selection, pending scope edits, and dirty state.
- Failures and timeouts replace progress with actionable warning details, while restarted or closed dialogs receive no stale delayed update.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hide-model-refreshed-status",
  "sourcePr": 741,
  "archive": "openspec/changes/archive/2026-10-09-hide-model-refreshed-status/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-hide-model-refreshed-status/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "0cac0392c594398b465f7f0882dbe6eeb0b78ccf",
  "acceptanceScenarios": [
    "Successful catalog refresh keeps `(refreshing)` visible for the one-second minimum, then removes the suffix directly without showing `(refreshed)` or a success sentence.",
    "Refreshed models preserve the query, surviving selection, pending scope edits, and dirty state.",
    "Failures and timeouts replace progress with actionable warning details, while restarted or closed dialogs receive no stale delayed update."
  ],
  "archiveDigest": "a7e57031d93d3762930a21114fde31de7c4b6777c5bd0c48f1fc988c5f6af1ab",
  "specDigest": "80ef548af9a113b84412ca931b60dfedcabd4aed63b50d98ae6202b35b366ab4",
  "tasksDigest": "10c65c9d0e8709f4a8579d88fcef47e54d94b130c274bc24f0a568e1c53b8ef2",
  "evidenceDigest": "1688c4a381f85538a9367349c202595bb949761bf254580cd3ab5cf435875cec",
  "knownGaps": []
}
```
