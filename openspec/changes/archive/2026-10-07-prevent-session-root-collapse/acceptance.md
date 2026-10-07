# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Left and Right keep the system `session` entry expanded without changing visible rows or selection, even when hidden model and thinking metadata precedes it.
- Left on a descendant no longer collapses the whole tree when the session root is its only containing fold candidate.
- Eligible nested non-root branches still collapse and expand in place, including when filtering hides the system root.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "prevent-session-root-collapse",
  "sourcePr": 698,
  "archive": "openspec/changes/archive/2026-10-07-prevent-session-root-collapse/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-prevent-session-root-collapse/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "885df1a2bf8583efe61517f1b383d7347f79db3a",
  "acceptanceScenarios": [
    "Left and Right keep the system `session` entry expanded without changing visible rows or selection, even when hidden model and thinking metadata precedes it.",
    "Left on a descendant no longer collapses the whole tree when the session root is its only containing fold candidate.",
    "Eligible nested non-root branches still collapse and expand in place, including when filtering hides the system root."
  ],
  "archiveDigest": "8c83b8fe998b87cacc47c71da97708b4da9a0a9d9beb869ef749fdc59c8b130f",
  "specDigest": "e92eeb6a356c492e6bf702d619707e7d76874196ebeaaaf234da641d0ab57909",
  "tasksDigest": "6263d107214007acd6ccb4b357ef19e46607389b52359e572872e670857ab1a4",
  "evidenceDigest": "b2b563a1d21c99368ba3d0f5d3d94635870129507160d87816becf557a4a9c97",
  "knownGaps": []
}
```
