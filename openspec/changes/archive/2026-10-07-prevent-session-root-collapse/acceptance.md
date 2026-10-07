# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Left and Right keep the top-level `session` root expanded without changing visible rows or selection.
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
  "specBaseSha": "b21a9779baf6ed9e410f57a9f6c40e12403f5f86",
  "acceptanceScenarios": [
    "Left and Right keep the top-level `session` root expanded without changing visible rows or selection.",
    "Left on a descendant no longer collapses the whole tree when the session root is its only containing fold candidate.",
    "Eligible nested non-root branches still collapse and expand in place, including when filtering hides the system root."
  ],
  "archiveDigest": "58e37fec8e29ec1f59ce93066afcd9535e3640d2e5efca6ed7d69ebbae9f016c",
  "specDigest": "f453714401eb86e9b8eef66f93049b017549f6023514e5e872e97db46b6e1152",
  "tasksDigest": "4506ef16ad8a29ebb744dedba549683208cbcd7a1b69277d609c3c8eb70cbc09",
  "evidenceDigest": "87945130467d76434c16f000fa56eea68b3013abc4a5ad8540157fb8a817b962",
  "knownGaps": []
}
```
