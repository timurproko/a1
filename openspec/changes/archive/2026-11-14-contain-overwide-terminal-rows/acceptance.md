# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A transcript row containing a lone regional indicator such as 🇺 no longer stops A1 with an unexpected error.
- A row wider than the terminal is clipped to the terminal width and the session keeps running.
- A clipped row keeps whole characters and does not leak colour or link state into following rows.
- A Kitty image on an over-width row is still drawn while the text beside it is clipped.
- Rows that already fit the terminal are rendered exactly as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "contain-overwide-terminal-rows",
  "sourcePr": 933,
  "archive": "openspec/changes/archive/2026-11-14-contain-overwide-terminal-rows/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-contain-overwide-terminal-rows/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "ac3f4997237d0a17e346c55e5b39d30cade34b0b",
  "acceptanceScenarios": [
    "A transcript row containing a lone regional indicator such as 🇺 no longer stops A1 with an unexpected error.",
    "A row wider than the terminal is clipped to the terminal width and the session keeps running.",
    "A clipped row keeps whole characters and does not leak colour or link state into following rows.",
    "A Kitty image on an over-width row is still drawn while the text beside it is clipped.",
    "Rows that already fit the terminal are rendered exactly as before."
  ],
  "archiveDigest": "66d54c81fe16eba7936464c8cff1dbad04f514efcef665a6d82665f4b76cca6f",
  "specDigest": "dfb7a42f8bfc5cfad76052d0a8348c9bf0e9cf689932f970d1652206f126bc1b",
  "tasksDigest": "2067b889c5e59af9dc06c5bcdafabcfcb529b14a6ddcfb7f8da3f85ad6678227",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
