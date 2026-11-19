# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A primary drag can start on transcript content, `Working…`, input/autocomplete rows, or footer/status rows and continue through the complete frame without breaking.
- Status, input, autocomplete, footer, and whitespace-only selections remain visibly blue but do not submit or replace clipboard content automatically or through Ctrl+C.
- Selecting one submitted prompt copies only its prompt text; selecting a larger transcript block continues to copy the full visible transcript block, including any prompt row inside it.
- A successful `copied N chars to clipboard` acknowledgement remains readable over a selected row without a dark reset box.
- A drag may pause on `Working…` through multiple animation ticks and then continue freely upward or downward without clearing or truncating; explicit controls retain their mouse ownership.
- A downward drag remains active when streaming output reflows the live assistant tail immediately above `Working…` before the next pointer report.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-progress-spinner-mouse-selection",
  "sourcePr": 727,
  "archive": "openspec/changes/archive/2026-10-08-fix-progress-spinner-mouse-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-fix-progress-spinner-mouse-selection/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "339093446850868baa3a48162733d94d5eecad73",
  "acceptanceScenarios": [
    "A primary drag can start on transcript content, `Working…`, input/autocomplete rows, or footer/status rows and continue through the complete frame without breaking.",
    "Status, input, autocomplete, footer, and whitespace-only selections remain visibly blue but do not submit or replace clipboard content automatically or through Ctrl+C.",
    "Selecting one submitted prompt copies only its prompt text; selecting a larger transcript block continues to copy the full visible transcript block, including any prompt row inside it.",
    "A successful `copied N chars to clipboard` acknowledgement remains readable over a selected row without a dark reset box.",
    "A drag may pause on `Working…` through multiple animation ticks and then continue freely upward or downward without clearing or truncating; explicit controls retain their mouse ownership.",
    "A downward drag remains active when streaming output reflows the live assistant tail immediately above `Working…` before the next pointer report."
  ],
  "archiveDigest": "0f6c89927fbbe858f6c7f7b65f26046f00a79e9a0639b0b8af0ddb35ffb56161",
  "specDigest": "65dc8c3362a59413f618d8a3444f9c2a0d2dc9a500b2c67792eeb803de47b7dd",
  "tasksDigest": "cfcd9e414ae2f76eab048757e0dc918d6778d3ce9fcec2a61799d01f86236ea9",
  "evidenceDigest": "84784e1c2ce4a4bb0d90f266afa9047522b16ca24aebde99cff0448575c552cf",
  "knownGaps": []
}
```
