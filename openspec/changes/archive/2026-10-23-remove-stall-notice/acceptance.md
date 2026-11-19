# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A working tab with no model or tool progress for five minutes or longer keeps its working spinner, and no `No progress` line is added to the transcript.
- No `Agent stalled` notice row appears under the tab strip for a stalled or unresponsive tab.
- A tab whose A1 process stops sending heartbeats keeps its previous chip glyph and colour, with no yellow `!`, and still restarts automatically from its session after 120 seconds.
- A bare `R` typed into a stalled or unresponsive tab reaches the tab as text instead of restarting it.
- The failed-tab banner with its `R` retry, `F` start fresh, and `Alt+W` close keys is unchanged.
- `a1 tabs host status` no longer lists a stalled-transitions counter and still reports unresponsive transitions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-stall-notice",
  "sourcePr": 818,
  "archive": "openspec/changes/archive/2026-10-23-remove-stall-notice/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-23-remove-stall-notice/acceptance.md",
  "finalizedDate": "2026-10-23",
  "specBaseSha": "cb802f39bbc4bfdc5165bd140fd7cb227c2a0932",
  "acceptanceScenarios": [
    "A working tab with no model or tool progress for five minutes or longer keeps its working spinner, and no `No progress` line is added to the transcript.",
    "No `Agent stalled` notice row appears under the tab strip for a stalled or unresponsive tab.",
    "A tab whose A1 process stops sending heartbeats keeps its previous chip glyph and colour, with no yellow `!`, and still restarts automatically from its session after 120 seconds.",
    "A bare `R` typed into a stalled or unresponsive tab reaches the tab as text instead of restarting it.",
    "The failed-tab banner with its `R` retry, `F` start fresh, and `Alt+W` close keys is unchanged.",
    "`a1 tabs host status` no longer lists a stalled-transitions counter and still reports unresponsive transitions."
  ],
  "archiveDigest": "562a0c93f044caeebd7df1bee20ef8afd3fded2fbb5cfbd7c4d9959214f615da",
  "specDigest": "7c9467f61dafcbb1c7c18e01f4ccfec6fb02b62fc762c0a285dfec1a6ba2a22b",
  "tasksDigest": "ba3153f0e4a16d1aea6a3e952be6411c87f767a555b2d79ebf7ab13beb69ee3e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
