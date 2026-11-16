# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Success, failure, and observation-stop messages follow visible status rows with exactly one blank line and start at the left margin.
- Interrupted or unavailable observation places its reason, unknown-outcome guidance, and log link on separate lines without implying remote cancellation.
- Empty progress reuses the header separator, and redraws or terminal fallbacks preserve follow-up alignment.
- Failure details retain bounded diagnostics with left-margin bullet markers, and workflow success still requires registry verification.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-publication-output-boundaries",
  "sourcePr": 962,
  "archive": "openspec/changes/archive/2026-11-16-unify-publication-output-boundaries/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-unify-publication-output-boundaries/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "fe2e7e01a949688af34b920a43027bbc85e340ee",
  "acceptanceScenarios": [
    "Success, failure, and observation-stop messages follow visible status rows with exactly one blank line and start at the left margin.",
    "Interrupted or unavailable observation places its reason, unknown-outcome guidance, and log link on separate lines without implying remote cancellation.",
    "Empty progress reuses the header separator, and redraws or terminal fallbacks preserve follow-up alignment.",
    "Failure details retain bounded diagnostics with left-margin bullet markers, and workflow success still requires registry verification."
  ],
  "archiveDigest": "240b8ed3fadc86bdb36f1a8358708caaf3075d669f4894ae5ffaaaadd478ad8a",
  "specDigest": "330fda17393079a94b582482ef9366ea7e7df4aa532f9d2d477aa86af44fbe72",
  "tasksDigest": "326d50c9fb121969aa40b885860170d93ab66ef18afbe128b596c00722ef1855",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
