# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare A1 image-limit errors name Ctrl+P, Settings, Agent, Prompt image limit; fixed limits show no hint and no /settings.
- Resuming a session held by another A1 process prints that it is open there, not that it is in a different project.
- The recalled-prompt border reads History 100/100 for the newest and History 1/100 for the oldest of 100 entries.
- The README navigator lists Session colors and Uninstall, and the Update setting values read Auto and Manual.
- The ci.yml startup comment says only stable publication fails on an overrun.
- Interactive a1 uninstall asks one question and keeps the profile home; --purge still removes it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-small-findings",
  "sourcePr": 997,
  "archive": "openspec/changes/archive/2026-11-19-fix-small-findings/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-fix-small-findings/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "25d2964c846951c1b10453877c9177c680859df2",
  "acceptanceScenarios": [
    "Bare A1 image-limit errors name Ctrl+P, Settings, Agent, Prompt image limit; fixed limits show no hint and no /settings.",
    "Resuming a session held by another A1 process prints that it is open there, not that it is in a different project.",
    "The recalled-prompt border reads History 100/100 for the newest and History 1/100 for the oldest of 100 entries.",
    "The README navigator lists Session colors and Uninstall, and the Update setting values read Auto and Manual.",
    "The ci.yml startup comment says only stable publication fails on an overrun.",
    "Interactive a1 uninstall asks one question and keeps the profile home; --purge still removes it."
  ],
  "archiveDigest": "a302d51e0784fa5d14466c77782d2dcdba6b00dd149539270e6de5218ef40716",
  "specDigest": "99c45317a3823865ba153abc1e3a5c57b7e5186c318fa9ce2ca641b66866c03f",
  "tasksDigest": "3d0e3f148df5a37318e1734d24c6f24ac763e9f3411b601c610f02c253e0b674",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
