# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Installation, predecessor update, and authenticated recovery commands fail after two minutes without treating partial installation as success.
- Published-pair smoke has an eight-minute step backstop and a ten-minute job backstop, with unconditional evidence upload after failure.
- Silent commands show their phase, timeout, and periodic elapsed time, and progress timers stop with their command.
- Two-minute commands retain process sampling, and sanitized failure evidence is checkpointed before cleanup and updated with secondary cleanup failures.
- Only authenticated known legacy crashes permit installer recovery, and every failed smoke lane continues to block promotion.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "shorten-published-smoke-timeouts",
  "sourcePr": 952,
  "archive": "openspec/changes/archive/2026-11-16-shorten-published-smoke-timeouts/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-shorten-published-smoke-timeouts/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "e449cc683579e67e225af4db71a434044f985276",
  "acceptanceScenarios": [
    "Installation, predecessor update, and authenticated recovery commands fail after two minutes without treating partial installation as success.",
    "Published-pair smoke has an eight-minute step backstop and a ten-minute job backstop, with unconditional evidence upload after failure.",
    "Silent commands show their phase, timeout, and periodic elapsed time, and progress timers stop with their command.",
    "Two-minute commands retain process sampling, and sanitized failure evidence is checkpointed before cleanup and updated with secondary cleanup failures.",
    "Only authenticated known legacy crashes permit installer recovery, and every failed smoke lane continues to block promotion."
  ],
  "archiveDigest": "d52911b99fff947fbea57cbae7577e999c6188ade921de762ff286cf5e8b70eb",
  "specDigest": "708ad31cb98b8c414b264834688e51858afbf58968f1863f218a63ed060bfe94",
  "tasksDigest": "842af69991faa5eaa17952c405514b2326589833e66e8fc621c0b0fb701e5be6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
