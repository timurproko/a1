# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- npm-generated Unix bin symlinks start the same installer executable as direct and Windows launcher paths.
- Invoking the installed launcher with `--help` returns the exact supported usage on stdout, empty stderr, and status zero.
- Importing installer helpers does not run installation or alter the importing process verdict.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-installer-unix-launch",
  "sourcePr": 599,
  "archive": "openspec/changes/archive/2026-09-27-fix-installer-unix-launch/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-fix-installer-unix-launch/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "d6e8f0f6c47ad10aa2d7a945c0bbd4efe1a95178",
  "acceptanceScenarios": [
    "npm-generated Unix bin symlinks start the same installer executable as direct and Windows launcher paths.",
    "Invoking the installed launcher with `--help` returns the exact supported usage on stdout, empty stderr, and status zero.",
    "Importing installer helpers does not run installation or alter the importing process verdict."
  ],
  "archiveDigest": "9f5a3e05fe330e9c72e2268d485c4bdba1b4a12a0fdd95bc64ff7079a8f821f6",
  "specDigest": "64663e470e262fdab766a5036d2fb3868dee3da5ca3f4a77514cc395cedd72fb",
  "tasksDigest": "9ee6897b3cbbe74b9cd36886fe121e66bfee77e290dd7ef02f76e13393adbe2c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
