# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Named bare-A1 sessions publish their safe normalized session name; unnamed sessions publish a1.
- Renaming and session rebinding update the title without redundant writes for unchanged core names.
- Only the attached presenter publishes titles, and reactivation restores its current session title.
- Extension title overrides survive unrelated updates and yield to a changed session name or reactivation.
- The comparison profile retains its existing title behavior and extension title support.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publish-session-name-terminal-title",
  "sourcePr": 892,
  "archive": "openspec/changes/archive/2026-11-09-publish-session-name-terminal-title/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-09-publish-session-name-terminal-title/acceptance.md",
  "finalizedDate": "2026-11-09",
  "specBaseSha": "47397a0a5b680ed23515a914597d42c489e691ea",
  "acceptanceScenarios": [
    "Named bare-A1 sessions publish their safe normalized session name; unnamed sessions publish a1.",
    "Renaming and session rebinding update the title without redundant writes for unchanged core names.",
    "Only the attached presenter publishes titles, and reactivation restores its current session title.",
    "Extension title overrides survive unrelated updates and yield to a changed session name or reactivation.",
    "The comparison profile retains its existing title behavior and extension title support."
  ],
  "archiveDigest": "1f63aa22b5762533294ac54a119b49c9f0f8851452d83dc879aec15f23828cb3",
  "specDigest": "52b77eaf4366db5bf1b352eb29303a8b8e0ae827b1f2589e32fad4ac30343158",
  "tasksDigest": "de818c3517a92fb45eb36607b039c7c9365692646af91998c72a018569415bfa",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
