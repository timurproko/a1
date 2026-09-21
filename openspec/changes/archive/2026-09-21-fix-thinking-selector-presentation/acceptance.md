# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The bare-A1 thinking dialog places its muted cycle hint directly below the title, renders each level once with aligned muted-grey descriptions, places one green checkmark directly after the active level name, and does not duplicate that level in the footer.
- The dialog uses a bold accent heading and displays the effective thinking-cycle shortcut, including `Ctrl+L` by default and explicit overrides.
- Filtering, selection, default persistence, cancellation, and the `a1 pi` comparison profile retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-thinking-selector-presentation",
  "sourcePr": 529,
  "archive": "openspec/changes/archive/2026-09-21-fix-thinking-selector-presentation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-fix-thinking-selector-presentation/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "2226c9d00fb394988592149e312118104089a837",
  "acceptanceScenarios": [
    "The bare-A1 thinking dialog places its muted cycle hint directly below the title, renders each level once with aligned muted-grey descriptions, places one green checkmark directly after the active level name, and does not duplicate that level in the footer.",
    "The dialog uses a bold accent heading and displays the effective thinking-cycle shortcut, including `Ctrl+L` by default and explicit overrides.",
    "Filtering, selection, default persistence, cancellation, and the `a1 pi` comparison profile retain their existing behavior."
  ],
  "archiveDigest": "03b106ac2b1b7639116bff7cccb28974829d85f8bab94e56e5c4cc64017f6a4f",
  "specDigest": "d74906fab1f766845bf4f5659d33d4dcb9945d7de34e5857c04aeb42f3929200",
  "tasksDigest": "8e8220870cf75a7532c72e4071c1cf8d22b274f9ed2f355cd8baae240869cc34",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
