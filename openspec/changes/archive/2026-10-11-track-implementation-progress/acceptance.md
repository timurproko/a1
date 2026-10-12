# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- New delivery PRs expose two to ten scoped Implementation tasks through GitHub's native completed-versus-total progress.
- Task-list candidates with unchecked, malformed, duplicated, or generic implementation items fail finalization.
- Historical plain Implementation bullets remain readable, while Acceptance stays plain and maintainer integration decides acceptance.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "track-implementation-progress",
  "sourcePr": 757,
  "archive": "openspec/changes/archive/2026-10-11-track-implementation-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-track-implementation-progress/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "f1beb1b69a81a69a0637590d8b980ec6e37cc41f",
  "acceptanceScenarios": [
    "New delivery PRs expose two to ten scoped Implementation tasks through GitHub's native completed-versus-total progress.",
    "Task-list candidates with unchecked, malformed, duplicated, or generic implementation items fail finalization.",
    "Historical plain Implementation bullets remain readable, while Acceptance stays plain and maintainer integration decides acceptance."
  ],
  "archiveDigest": "c0d68dd9b0d52f366ada21390f8b1e79a0cb95c75d23446392f9c92e37ed396e",
  "specDigest": "6158626114963d7308be3577004478c352d172b008793956c4f26c61c7962484",
  "tasksDigest": "a2b774296065f08ae589a6d3decc02e4205e3e18c3c2cf5cbcf7a681d6fe0883",
  "evidenceDigest": "ec561a748ef83f9e4092a96a2a2a24064021e734a23ad86f7fc9781b9de4b06c",
  "knownGaps": []
}
```
