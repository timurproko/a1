# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Running the suite from a Ghostty shell (`TERM_PROGRAM=ghostty`) no longer fails the link, hover, paste-chip, settings selector, quit outro or rendering stability tests.
- Running from Windows Terminal, tmux, Kitty, WezTerm, iTerm2 or Warp gives the same terminal capabilities inside tests as CI's Linux runners.
- `TERM` and `COLORTERM` still reach tests unchanged, so colour-depth behaviour is not affected.
- The guard test fails if any listed terminal variable reaches a test worker, or if capability detection reports images or terminal-specific hyperlinks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "test-terminal-env",
  "sourcePr": 889,
  "archive": "openspec/changes/archive/2026-11-08-test-terminal-env/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-test-terminal-env/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "3149760a907d4e5b446284c3e22312739bd48055",
  "acceptanceScenarios": [
    "Running the suite from a Ghostty shell (`TERM_PROGRAM=ghostty`) no longer fails the link, hover, paste-chip, settings selector, quit outro or rendering stability tests.",
    "Running from Windows Terminal, tmux, Kitty, WezTerm, iTerm2 or Warp gives the same terminal capabilities inside tests as CI's Linux runners.",
    "`TERM` and `COLORTERM` still reach tests unchanged, so colour-depth behaviour is not affected.",
    "The guard test fails if any listed terminal variable reaches a test worker, or if capability detection reports images or terminal-specific hyperlinks."
  ],
  "archiveDigest": "b82d8bb2e7972b2fb9d4aeca6481a0919d14142c878159d0f221161f081080cb",
  "specDigest": "8a4925553d624d21e276e3b4f7ef7aec73ab524ddcda6fdb572d4e4330245a07",
  "tasksDigest": "876bd6dcdc97540b1709417607b3b850f701431c15cfdec230b5f4ab67101f44",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
