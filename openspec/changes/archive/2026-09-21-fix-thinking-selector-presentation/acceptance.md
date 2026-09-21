# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The bare-A1 thinking dialog renders every description inline in muted grey and shows the active level once with a trailing green checkmark.
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
    "The bare-A1 thinking dialog renders every description inline in muted grey and shows the active level once with a trailing green checkmark.",
    "The dialog uses a bold accent heading and displays the effective thinking-cycle shortcut, including `Ctrl+L` by default and explicit overrides.",
    "Filtering, selection, default persistence, cancellation, and the `a1 pi` comparison profile retain their existing behavior."
  ],
  "archiveDigest": "04ac5a68c01fe88646592b097652ab0d4ce42030644b3293d247946f7f55d354",
  "specDigest": "33d773c2e612577729588d98063fe9db40a934fa792af7a803484a329baaec2d",
  "tasksDigest": "890d973d0271c3973c97efb3046aa5506df9e9fcda6faa374033695c9c665275",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
