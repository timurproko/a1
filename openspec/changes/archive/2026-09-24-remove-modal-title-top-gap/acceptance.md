# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A ready PR without implementation metadata is rejected when immutable base/head evidence shows a new or restored active change, or active-change edits mixed with code or operational paths.
- Ordinary code PRs, active-change removal, and documentation-only revisions to an existing active change retain their established validation routes.
- The retained PR #573 worktree becomes cleanup-eligible only when the archived repair record, both exact pull-request identities, successful CI, authorized manual merges, synchronized specifications, archive state, ancestry, and absent remote refs all verify.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-modal-title-top-gap",
  "sourcePr": 580,
  "archive": "openspec/changes/archive/2026-09-24-remove-modal-title-top-gap/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-remove-modal-title-top-gap/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "ac123a6604960e8ecbed86a544d2e3d17086d65c",
  "acceptanceScenarios": [
    "A ready PR without implementation metadata is rejected when immutable base/head evidence shows a new or restored active change, or active-change edits mixed with code or operational paths.",
    "Ordinary code PRs, active-change removal, and documentation-only revisions to an existing active change retain their established validation routes.",
    "The retained PR #573 worktree becomes cleanup-eligible only when the archived repair record, both exact pull-request identities, successful CI, authorized manual merges, synchronized specifications, archive state, ancestry, and absent remote refs all verify."
  ],
  "archiveDigest": "7b3ab2119852f05e38d1ea7083b3cbae21110afc594ce90c235c49a2b2411f6a",
  "specDigest": "a7698598f4a8e0171f379664db3bdac28af23108f3bd17934eec9adb17c548dd",
  "tasksDigest": "5d492f55a412624ac4ae864fc35ea18c226cf721e90235b40035b769f3a526e9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
