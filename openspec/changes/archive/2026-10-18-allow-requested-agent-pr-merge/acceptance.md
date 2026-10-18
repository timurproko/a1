# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- An explicit maintainer request lets the active agent protected-squash-merge the unchanged finalized candidate.
- A changed, pending, ambiguous, or automation-credential candidate remains unmerged and requires a fresh maintainer request.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "allow-requested-agent-pr-merge",
  "sourcePr": 805,
  "archive": "openspec/changes/archive/2026-10-18-allow-requested-agent-pr-merge/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-18-allow-requested-agent-pr-merge/acceptance.md",
  "finalizedDate": "2026-10-18",
  "specBaseSha": "3513efa745148527e3b635de4a8a89024fd7e32f",
  "acceptanceScenarios": [
    "An explicit maintainer request lets the active agent protected-squash-merge the unchanged finalized candidate.",
    "A changed, pending, ambiguous, or automation-credential candidate remains unmerged and requires a fresh maintainer request."
  ],
  "archiveDigest": "771c39f4bd8a888c792d80032f5e983283f809ecfecdb6d4fbadaa72d21ad7b1",
  "specDigest": "a8ba3ae89e22fe602bab094f907b13dfd284b5c914046794d36156673a1f5e3d",
  "tasksDigest": "47aa50302f8ee91556681786607557a9b04216b8e0d645286e94d5b1a1681360",
  "evidenceDigest": "cae936836a154c7e739e849de57ca5fab8acbfa3a7df6f1b0118e5ecad71b9a0",
  "knownGaps": []
}
```
