# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Running config, auth or mcp prints that the command is not supported.
- An unsupported Pi option or a file input fails with a plain not supported message.
- The interactive help no longer describes delivery progress or pending work.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "cli-unsupported-messages",
  "sourcePr": 996,
  "archive": "openspec/changes/archive/2026-11-19-cli-unsupported-messages/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-cli-unsupported-messages/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "f6f04f45d0f409115d3ba12817e6883596becae5",
  "acceptanceScenarios": [
    "Running config, auth or mcp prints that the command is not supported.",
    "An unsupported Pi option or a file input fails with a plain not supported message.",
    "The interactive help no longer describes delivery progress or pending work."
  ],
  "archiveDigest": "bc6131a49f9624713da3a1da0419d3a05e0675052e02e36da5ac80309395e6c8",
  "specDigest": "9fe66af65ef53cd015028d0f2135620476c04c4a7b9741ccc48d72cb179856ec",
  "tasksDigest": "e6c12631d130511f07aeb04ffb5e8de5b2715c1041fa763dcc6c22b86c3955f5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
