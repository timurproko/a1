# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A failed scheduled Full regression run opens a draft `fix/nightly-regression-YYYY-MM-DD` pull request whose body lists the failed commands per lane, their tests, a bounded log excerpt, and the `develop` commits since the last green run.
- A later failure with the same failed scope set appends its run to the open candidate instead of opening another; a manually dispatched Release failure opens nothing.
- A fix candidate is handed off only after a dispatched Full regression of its head passes and is recorded in the change's design evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "automate-nightly-regression-triage",
  "sourcePr": 501,
  "archive": "openspec/changes/archive/2026-09-19-automate-nightly-regression-triage/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-automate-nightly-regression-triage/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "69e3cfd25f003f238bb7d2e31754fa944ee82e23",
  "acceptanceScenarios": [
    "A failed scheduled Full regression run opens a draft `fix/nightly-regression-YYYY-MM-DD` pull request whose body lists the failed commands per lane, their tests, a bounded log excerpt, and the `develop` commits since the last green run.",
    "A later failure with the same failed scope set appends its run to the open candidate instead of opening another; a manually dispatched Release failure opens nothing.",
    "A fix candidate is handed off only after a dispatched Full regression of its head passes and is recorded in the change's design evidence."
  ],
  "archiveDigest": "e451916c2bfd6b071afc386d26563a65b9543551ac6dde323034e55e4180d336",
  "specDigest": "442d0d78d57f52078d1372c051e1916f559d0fa30509767e4514f0171df32084",
  "tasksDigest": "d8869b518d841cad9cf35342a69ab38c1cce74c7fc7a51edd3ac65f99a20d661",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
