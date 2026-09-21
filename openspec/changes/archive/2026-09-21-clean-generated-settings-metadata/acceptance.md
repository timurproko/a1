# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Completed-delivery cleanup removes the exact ignored Pi settings metadata regular file through the existing bounded, non-force path.
- Near-match metadata names and unrelated ignored content remain `worktree-content` blockers.
- Symbolic links and special files remain rejected while approved generated directories continue to clean normally.
- Vitest metadata stays shared for overlapping test processes and is deferred to verified worktree cleanup.
- PR #529 remains protected before integration and reports only the exact generated metadata artifact as its cleanup blocker.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clean-generated-settings-metadata",
  "sourcePr": 534,
  "archive": "openspec/changes/archive/2026-09-21-clean-generated-settings-metadata/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-clean-generated-settings-metadata/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "Completed-delivery cleanup removes the exact ignored Pi settings metadata regular file through the existing bounded, non-force path.",
    "Near-match metadata names and unrelated ignored content remain `worktree-content` blockers.",
    "Symbolic links and special files remain rejected while approved generated directories continue to clean normally.",
    "Vitest metadata stays shared for overlapping test processes and is deferred to verified worktree cleanup.",
    "PR #529 remains protected before integration and reports only the exact generated metadata artifact as its cleanup blocker."
  ],
  "archiveDigest": "2ca5a8c1cac31eeaec9979aecf26897ddae997180a85631cf42009ce7a49b0aa",
  "specDigest": "98cdddeaf13862dbc0af4d9dbeb1a8b3aafd795843b06f36f76d9c2780bd12b9",
  "tasksDigest": "2a1c3ab44db67340d4fdb6a4f401a2762f3c6c83cd2859592250d20f9b8f1b97",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
