# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Session Tree selection fills the complete available row width as focus moves among entries of different lengths.
- Selected entries preserve semantic foregrounds, hierarchy, horizontal clipping markers, and non-bold styling.
- Unselected rows and existing tree search, filtering, folding, navigation, labeling, copying, and selection behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "make-session-tree-selection-full-width",
  "sourcePr": 722,
  "archive": "openspec/changes/archive/2026-10-08-make-session-tree-selection-full-width/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-make-session-tree-selection-full-width/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "2badef9be9b34ed42f3498bfb53cbce8189e33b2",
  "acceptanceScenarios": [
    "Session Tree selection fills the complete available row width as focus moves among entries of different lengths.",
    "Selected entries preserve semantic foregrounds, hierarchy, horizontal clipping markers, and non-bold styling.",
    "Unselected rows and existing tree search, filtering, folding, navigation, labeling, copying, and selection behavior remain unchanged."
  ],
  "archiveDigest": "3eea260cf1010e426a5f211e4d2570afa0cd2069ed0fda1f3e7a308ae22fa608",
  "specDigest": "172a416317aed72e2b1409eaaed43cbfde2c5f93e880cb682d099b46bf67ca83",
  "tasksDigest": "90063a472caf29bd880eadb7835faecff78e8efc480ae262cbfc74dcca8a8852",
  "evidenceDigest": "9603f3616f8252ce8e3ab22b53e7518cb931178dbc0839d57ed9a42e53084a0c",
  "knownGaps": []
}
```
