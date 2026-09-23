# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Starting or resuming an interactive delivery links its exact owned worktree before edits, and the bare-A1 footer follows that feature branch and displays its open pull request number.
- A failed or mismatched worktree association stops feature edits while the primary checkout stays on `develop` and repository commands remain explicitly scoped to the intended worktree.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "require-delivery-worktree-context",
  "sourcePr": 558,
  "archive": "openspec/changes/archive/2026-09-23-require-delivery-worktree-context/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-require-delivery-worktree-context/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "ff361bf5a0bab3bf7dcb323f53431c6a33b69c82",
  "acceptanceScenarios": [
    "Starting or resuming an interactive delivery links its exact owned worktree before edits, and the bare-A1 footer follows that feature branch and displays its open pull request number.",
    "A failed or mismatched worktree association stops feature edits while the primary checkout stays on `develop` and repository commands remain explicitly scoped to the intended worktree."
  ],
  "archiveDigest": "8edb4d9b6af51e589a81339d8c862a7573f2dd081657893e7136bd98d35b8cb2",
  "specDigest": "01c7ab64c6a744491c00f154c77926c79131d374a3345a1cc739e037f478acff",
  "tasksDigest": "65f7c4ae85f9ba0bfbf4ba9761df88251a3e8e560423cb236034065af02ced41",
  "evidenceDigest": "ccd0c5c1bb7e9157f0c673ca3c719b3753da18ceaf9b5e4bdbb6ba80e805bb4c",
  "knownGaps": []
}
```
