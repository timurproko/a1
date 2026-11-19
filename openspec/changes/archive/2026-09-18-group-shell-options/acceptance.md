# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The session-shell, composition, TUI runtime, and owned-UI feature suites pass unchanged (1,087 cases) with every seam supplied through its group.
- The bare-A1 composition passes the engine group plus only the presentation, history, suggestions, and diagnostics it provides; a comparison profile passes no diagnostics group.
- `OwnedUiSessionShell` reads no flat option: every former field is bound from its group at the top of the constructor.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "group-shell-options",
  "sourcePr": 486,
  "archive": "openspec/changes/archive/2026-09-18-group-shell-options/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-group-shell-options/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "3ddd5862d6fd90d4001e619b013030eeb036c991",
  "acceptanceScenarios": [
    "The session-shell, composition, TUI runtime, and owned-UI feature suites pass unchanged (1,087 cases) with every seam supplied through its group.",
    "The bare-A1 composition passes the engine group plus only the presentation, history, suggestions, and diagnostics it provides; a comparison profile passes no diagnostics group.",
    "`OwnedUiSessionShell` reads no flat option: every former field is bound from its group at the top of the constructor."
  ],
  "archiveDigest": "df1296d64b3582d89e8a3f985bdaa4da3364a02b6eed89d12e170c3b7d9a26da",
  "specDigest": "42b7401a8b8272f79937e44b09e8967db13f953fbba0b17f7bd5fceb9414b916",
  "tasksDigest": "cf8b4b95d1f857798da86c31a81ca00d6269526115efe7f175f1a3696beada98",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
