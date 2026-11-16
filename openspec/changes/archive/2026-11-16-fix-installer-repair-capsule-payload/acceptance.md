# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The exact installer tarball includes its repair helper and starts from an isolated global installation without missing imports.
- Installed installer help lists the existing repair option while removed options remain rejected.
- An installer artifact missing the repair helper is rejected before npm staging.
- The installer retains its explicit minimal payload and dependency-free runtime metadata.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-installer-repair-capsule-payload",
  "sourcePr": 954,
  "archive": "openspec/changes/archive/2026-11-16-fix-installer-repair-capsule-payload/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-fix-installer-repair-capsule-payload/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "26618ed2c5b21c7d48173022136eabc084dc94ba",
  "acceptanceScenarios": [
    "The exact installer tarball includes its repair helper and starts from an isolated global installation without missing imports.",
    "Installed installer help lists the existing repair option while removed options remain rejected.",
    "An installer artifact missing the repair helper is rejected before npm staging.",
    "The installer retains its explicit minimal payload and dependency-free runtime metadata."
  ],
  "archiveDigest": "e58b5f08e9224577cc4495c6921a942a50825288db105c250ea8c6fbc8348101",
  "specDigest": "944e88b2eb4665f15171f58085c72688e2ed73884cf4d628cb5e93d124335a4e",
  "tasksDigest": "de6569fb6b5260845e3d994b827e655b9379be6663c1f8bf817d72603c9f2dd8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
