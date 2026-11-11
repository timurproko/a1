# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- An agent that loads only `AGENTS.md` receives the full progress rule: one task group per outcome and a tick after each outcome's push.
- `CLAUDE.md` imports `AGENTS.md`, so Claude Code and the A1 runtime follow the same single rule.
- The delivery skill and runbook point to that rule and name the commit, push, tick order without a second copy.
- A guidance regression test fails when the shared paragraph changes, is duplicated in the skill, or `CLAUDE.md` stops importing it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "progressive-implementation-ticks",
  "sourcePr": 916,
  "archive": "openspec/changes/archive/2026-11-11-progressive-implementation-ticks/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-progressive-implementation-ticks/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "bfbed9a4849fe7ba1b6a879cef7a800a132e18e9",
  "acceptanceScenarios": [
    "An agent that loads only `AGENTS.md` receives the full progress rule: one task group per outcome and a tick after each outcome's push.",
    "`CLAUDE.md` imports `AGENTS.md`, so Claude Code and the A1 runtime follow the same single rule.",
    "The delivery skill and runbook point to that rule and name the commit, push, tick order without a second copy.",
    "A guidance regression test fails when the shared paragraph changes, is duplicated in the skill, or `CLAUDE.md` stops importing it."
  ],
  "archiveDigest": "370d5b62085ab05a616c31775b33f890b7ffd0b3bfaea6726315bd1761dbc7be",
  "specDigest": "0a7ac696c968da642c5ea9efc263e7e1f9eda7f2f6317efc1165f84aa00c1286",
  "tasksDigest": "4606844cfbeca23e90593d42a71219a5cf9e7e27e5ad7e9c82fae1d5c6c71d7b",
  "evidenceDigest": "328175a3e7748de8f431b56a5054c76562c3bfeb617160d58f71f432e0b5c188",
  "knownGaps": []
}
```
