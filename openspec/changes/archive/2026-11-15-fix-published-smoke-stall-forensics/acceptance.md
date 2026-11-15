# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- While a smoke command with a budget of at least five minutes runs, the runner samples fixture-owned processes every ten seconds, never stops one, and never records a sampled identity into settlement state, so a reused pid cannot fail cleanup.
- Failure output includes each sampled process's pid, parent, start identity, first and last sighting, and sanitized arguments, plus sample and error counts and the last sampling error.
- On Windows failure, output includes up to one hundred sanitized events since the fixture began from the Defender operational log, crash and error-reporting providers, and service-failure or shutdown identifiers, with messages bounded to six hundred characters.
- Windows failure output also records Defender real-time, behavior-monitoring, antivirus, signature, and engine status.
- Outside Windows no system records are read; a reader failure or timeout is recorded while the primary stage failure stays authoritative.
- Failure output lists, per installation prefix, retired dot-prefixed package directories, the installed manifest version, and sanitized public launcher content or link target.
- Successful smokes, their assertions, budgets, and promotion gates are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-published-smoke-stall-forensics",
  "sourcePr": 948,
  "archive": "openspec/changes/archive/2026-11-15-fix-published-smoke-stall-forensics/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-fix-published-smoke-stall-forensics/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "52ddae3a93b82f3fe8df037a0f4ba853a2f51e31",
  "acceptanceScenarios": [
    "While a smoke command with a budget of at least five minutes runs, the runner samples fixture-owned processes every ten seconds, never stops one, and never records a sampled identity into settlement state, so a reused pid cannot fail cleanup.",
    "Failure output includes each sampled process's pid, parent, start identity, first and last sighting, and sanitized arguments, plus sample and error counts and the last sampling error.",
    "On Windows failure, output includes up to one hundred sanitized events since the fixture began from the Defender operational log, crash and error-reporting providers, and service-failure or shutdown identifiers, with messages bounded to six hundred characters.",
    "Windows failure output also records Defender real-time, behavior-monitoring, antivirus, signature, and engine status.",
    "Outside Windows no system records are read; a reader failure or timeout is recorded while the primary stage failure stays authoritative.",
    "Failure output lists, per installation prefix, retired dot-prefixed package directories, the installed manifest version, and sanitized public launcher content or link target.",
    "Successful smokes, their assertions, budgets, and promotion gates are unchanged."
  ],
  "archiveDigest": "1899ddc50d3c66965fe95a337ec1a9c9d54cc2465966c0598486f6112a997052",
  "specDigest": "611f07ad9e93acc55c77ef943ea43398d87fe7e8ba3f3ba643103c08c256848a",
  "tasksDigest": "95eedd60435c229747456f49a56fb50f868fd33a024dc6b1b446baf6fb3f922e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
