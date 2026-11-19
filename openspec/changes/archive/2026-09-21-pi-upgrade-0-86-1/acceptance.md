# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Run /login and confirm Meta appears among the providers, and that selecting it starts the Meta sign-in rather than reporting an unknown provider.
- Open an extension-supplied editor dialog that sets a description and confirm the description renders under the title, above the input.
- Run /session and /hotkeys and confirm both still match the pinned engine after the upgrade.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-86-1",
  "sourcePr": 526,
  "archive": "openspec/changes/archive/2026-09-21-pi-upgrade-0-86-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-pi-upgrade-0-86-1/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "8e22b033a36a9e4d74f64f0881fae73ea8592159",
  "acceptanceScenarios": [
    "Run /login and confirm Meta appears among the providers, and that selecting it starts the Meta sign-in rather than reporting an unknown provider.",
    "Open an extension-supplied editor dialog that sets a description and confirm the description renders under the title, above the input.",
    "Run /session and /hotkeys and confirm both still match the pinned engine after the upgrade."
  ],
  "archiveDigest": "dffd3caae5fa193bb5d3651904b85ed0fbcb9f9c0f875cb05f7e718363738582",
  "specDigest": "5205ab216ed9797285127b7f455ffc9c90cc90b5e001c27e38ee952aa84714fd",
  "tasksDigest": "64c1fd66589c7688260bb40774ad1d81ef14213b314bc966facc1d063ac7ac1b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
