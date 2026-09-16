# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- One exact post-merge command verifies and removes an eligible managed worktree and unchanged local branch without per-agent cleanup decisions.
- Repository-generated dependencies and finalization reports are handled automatically while unknown ignored or user-authored content remains protected.
- Tracked empty vendor .gitmodules metadata does not block cleanup, while real nested repositories, gitlinks, configured submodules, and submodule changes do.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "automate-managed-worktree-cleanup",
  "sourcePr": 435,
  "archive": "openspec/changes/archive/2026-09-16-automate-managed-worktree-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-automate-managed-worktree-cleanup/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "7dbe5ce44ebb0fbe03780b665dbb0974749c83d6",
  "acceptanceScenarios": [
    "One exact post-merge command verifies and removes an eligible managed worktree and unchanged local branch without per-agent cleanup decisions.",
    "Repository-generated dependencies and finalization reports are handled automatically while unknown ignored or user-authored content remains protected.",
    "Tracked empty vendor .gitmodules metadata does not block cleanup, while real nested repositories, gitlinks, configured submodules, and submodule changes do."
  ],
  "archiveDigest": "ee5e3112dde2e63ac5defe411f08571e860b594d55b0b879d123f9dd1708d0cd",
  "specDigest": "1fe027f174c82cd2724993c23529bba9c1e39bddb2ece7a8c91a844ba60c9391",
  "tasksDigest": "e8a6037ced13dda8c01041286f602bed6c3a877297fece59b88353170e711722",
  "evidenceDigest": "5c909a4970678293dcfe39b24e35531e5d9fdea985186b3e7cf4fce12b788c19",
  "knownGaps": []
}
```
