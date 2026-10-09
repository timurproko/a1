# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A shell whose construction throws releases every settings owner, engine event listener, and its root, leaves the engine a detached workflow interaction host, and rethrows the original error.
- Once disposal is requested, engine events no longer update the view or request a render, and the stop event still settles the shell.
- When the engine's quit hangs, the terminal is restored within the cleanup deadline and `shutdown()` reports the engine's outcome once it settles.
- Concurrent `dispose()` calls share one teardown and its failure; a later call resolves without tearing down again.
- Bare `a1` and `a1 pi` sessions start, quit through `/quit` and double Ctrl+C, and restore the terminal as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-shell-lifecycle-ordering",
  "sourcePr": 732,
  "archive": "openspec/changes/archive/2026-10-09-session-shell-lifecycle-ordering/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-session-shell-lifecycle-ordering/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "8633eba3a7822a3148330b7d3572c752f33abe40",
  "acceptanceScenarios": [
    "A shell whose construction throws releases every settings owner, engine event listener, and its root, leaves the engine a detached workflow interaction host, and rethrows the original error.",
    "Once disposal is requested, engine events no longer update the view or request a render, and the stop event still settles the shell.",
    "When the engine's quit hangs, the terminal is restored within the cleanup deadline and `shutdown()` reports the engine's outcome once it settles.",
    "Concurrent `dispose()` calls share one teardown and its failure; a later call resolves without tearing down again.",
    "Bare `a1` and `a1 pi` sessions start, quit through `/quit` and double Ctrl+C, and restore the terminal as before."
  ],
  "archiveDigest": "fb8aca95283a2dd8e8e3a8b6ce776622bb3f59a0e6dde88857111239f8c209b7",
  "specDigest": "997dc00f0ef1306b2287398fe0371d3bf76c61645dc403e6cc3b766bf7619f2c",
  "tasksDigest": "a2aec6ad4360327b8c07b0a7bb289c8e2d99a7d91592f732957e11adcd87761b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
