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
  "archiveDigest": "7fde56e91688100093e8629b245a7f812541f71a598fb948ce1be47bf65ae3f0",
  "specDigest": "4f1f23b17f1fe39e3aa80433e14adca9e6a3f95cb26b020d1a16cc3a2ee1fc7e",
  "tasksDigest": "ae34147dc069d4da5006eaba24f3f82a9170a823eaede8dd531998b9cc4240cf",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
