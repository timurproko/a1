# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Completing every implementation checkbox automatically transitions an eligible exact draft snapshot to ready for review without an agent-issued ready command.
- Incomplete, malformed, historical, unrelated, forked, stale, or raced drafts remain draft without content mutation or Development test execution.
- Automated readiness starts finalization and exact-head validation without accepting behavior, arming auto-merge, or integrating the pull request.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "enforce-delivery-ready-transition",
  "sourcePr": 766,
  "archive": "openspec/changes/archive/2026-10-13-enforce-delivery-ready-transition/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-13-enforce-delivery-ready-transition/acceptance.md",
  "finalizedDate": "2026-10-13",
  "specBaseSha": "e7c3138cfee253362961092b5480c44af2f9a122",
  "acceptanceScenarios": [
    "Completing every implementation checkbox automatically transitions an eligible exact draft snapshot to ready for review without an agent-issued ready command.",
    "Incomplete, malformed, historical, unrelated, forked, stale, or raced drafts remain draft without content mutation or Development test execution.",
    "Automated readiness starts finalization and exact-head validation without accepting behavior, arming auto-merge, or integrating the pull request."
  ],
  "archiveDigest": "99d835da7d3427da228676335d3415eb90d410ba82a86dc3e84d197f48cb3cd6",
  "specDigest": "999980b8080bbc84d93e41776c7a2064a2e65e7eb771761c750e02e21cb31a40",
  "tasksDigest": "86a6cba413676be05e7e9ef62109b9a681fd321ce3753cc5e004664d9fb123a2",
  "evidenceDigest": "edf6ffa92ba2c7cc842160115bc58e11df0a3182e5d1337d672fbff34fb34cab",
  "knownGaps": []
}
```
