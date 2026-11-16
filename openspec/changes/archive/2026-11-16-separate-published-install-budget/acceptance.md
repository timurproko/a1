# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Fresh, predecessor, and authenticated repair installations have five-minute deadlines and continue exact-package and launcher checks after a slow install.
- Installer acquisition and predecessor updates retain two-minute deadlines, and queries and launches retain thirty-second deadlines.
- Published pair smoke uses a twenty-five-minute exercise backstop and a thirty-minute job backstop, retaining diagnostics and unconditional evidence upload.
- Generic timeouts never authorize legacy recovery, and failed smoke lanes continue to block public tag promotion.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "separate-published-install-budget",
  "sourcePr": 955,
  "archive": "openspec/changes/archive/2026-11-16-separate-published-install-budget/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-separate-published-install-budget/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "1188a5ba7001db9816b3e3898740cba7b4c33c22",
  "acceptanceScenarios": [
    "Fresh, predecessor, and authenticated repair installations have five-minute deadlines and continue exact-package and launcher checks after a slow install.",
    "Installer acquisition and predecessor updates retain two-minute deadlines, and queries and launches retain thirty-second deadlines.",
    "Published pair smoke uses a twenty-five-minute exercise backstop and a thirty-minute job backstop, retaining diagnostics and unconditional evidence upload.",
    "Generic timeouts never authorize legacy recovery, and failed smoke lanes continue to block public tag promotion."
  ],
  "archiveDigest": "5f723eacb17252d6824c1ed92038684e8118b5d3d6284ffa7ad46ceaede8189c",
  "specDigest": "2fea74bca132a61288eda683302b6207faece906fa45e51a335f308cbba1fb86",
  "tasksDigest": "f88677dbc9d749f2c92bb81c0aacd97a2c5e965572caa0abb20fd6e57b26ce6f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
