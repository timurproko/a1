# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The normal build leaves a verified current-platform terminal host that bare development launch can use.
- Windows source builds link a compatible cached or trusted-CI terminal library without invoking workstation Zig.
- Missing or incompatible terminal-library prerequisites fail the build instead of silently producing a single-agent-only tree.
- npm installation and validation preflight retain explicit core builds while native lanes keep terminal-host certification ownership.
- One Git Bash line can enter the worktree, build the complete application, and launch it through the color-safe development wrapper.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "make-normal-build-resident-ready",
  "sourcePr": 806,
  "archive": "openspec/changes/archive/2026-10-18-make-normal-build-resident-ready/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-18-make-normal-build-resident-ready/acceptance.md",
  "finalizedDate": "2026-10-18",
  "specBaseSha": "fc6c9058df097640be017e4a145daacb0d2d5b93",
  "acceptanceScenarios": [
    "The normal build leaves a verified current-platform terminal host that bare development launch can use.",
    "Windows source builds link a compatible cached or trusted-CI terminal library without invoking workstation Zig.",
    "Missing or incompatible terminal-library prerequisites fail the build instead of silently producing a single-agent-only tree.",
    "npm installation and validation preflight retain explicit core builds while native lanes keep terminal-host certification ownership.",
    "One Git Bash line can enter the worktree, build the complete application, and launch it through the color-safe development wrapper."
  ],
  "archiveDigest": "f6d54ad7804013e852230c1d77a0ac6ca5bfc9480aca136178476dc14b94d28b",
  "specDigest": "64e2e750cc60383336fe9515837049d1e1bafc0490be47dcad0a742c20bea589",
  "tasksDigest": "f7471076555ed3d1e5c4aaae97f322de0433b515c030c53959e989ab67852cbb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
