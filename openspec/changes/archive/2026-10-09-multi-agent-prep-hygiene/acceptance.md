# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- An unused import, local, or parameter in `src`, `bin`, or `test` fails `npm run typecheck`.
- No source, test, or baseline references the deleted `system-theme.ts`, and the pinned Pi source ledger records that upstream unit as declined, not adopted.
- `AgentEnginePort`, `AgentSessionPort`, and the command, event, and snapshot contracts are gone; the settings and package contracts and their tests are unchanged.
- Pi session commands keep their outcomes through the Pi-owned `PiSessionCommandOutcome` type.
- The transient-tail selection test composes its tailed input and still excludes steering and working rows from the copy.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "multi-agent-prep-hygiene",
  "sourcePr": 729,
  "archive": "openspec/changes/archive/2026-10-09-multi-agent-prep-hygiene/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-multi-agent-prep-hygiene/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "337ad3e7b9ae04a25875ebd8b890466612fba8db",
  "acceptanceScenarios": [
    "An unused import, local, or parameter in `src`, `bin`, or `test` fails `npm run typecheck`.",
    "No source, test, or baseline references the deleted `system-theme.ts`, and the pinned Pi source ledger records that upstream unit as declined, not adopted.",
    "`AgentEnginePort`, `AgentSessionPort`, and the command, event, and snapshot contracts are gone; the settings and package contracts and their tests are unchanged.",
    "Pi session commands keep their outcomes through the Pi-owned `PiSessionCommandOutcome` type.",
    "The transient-tail selection test composes its tailed input and still excludes steering and working rows from the copy."
  ],
  "archiveDigest": "9497496d65aaee1045c88ef915f7407d3fc7e4915ba28a53495d39b186977cfc",
  "specDigest": "4529be4f185a38df92b4dfb7739b0bc329a354f324323c9adc103648fa4c2986",
  "tasksDigest": "27d7c243c3523a68289dd8a49f71dc2c477c22a7caf0530049f3e06cf87b7384",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
