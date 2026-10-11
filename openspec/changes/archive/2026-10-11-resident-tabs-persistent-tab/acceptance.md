# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- `Resident tabs` appears under Generic and remains disabled by default; disabled, comparison, session-selected, unsupported, or unverified launches preserve the direct path.
- The authenticated single resident tab retains output and accepts input across detach and reattach without exposing tab credentials to extensions or child processes.
- Isolated Windows evidence passes terminal closure, Windows OpenSSH loss, retained output, reattach input, double-`Ctrl+C`, `/quit`, empty-editor `Ctrl+D`, and forced attach loss with a usable parent shell.
- Native Windows x64, macOS arm64, and Linux x64 role integration passes launch-tree loss, retained output, reattach input, exclusive attachment, mode restoration, and cold holder adoption.
- Physical macOS and Linux terminal/`sshd` evidence is explicitly uncertified and deferred to milestone 6; CI results are not relabeled as physical evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-persistent-tab",
  "sourcePr": 746,
  "archive": "openspec/changes/archive/2026-10-11-resident-tabs-persistent-tab/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-resident-tabs-persistent-tab/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "439d5313eb1e2b8723fd3a2e634d406a16132402",
  "acceptanceScenarios": [
    "`Resident tabs` appears under Generic and remains disabled by default; disabled, comparison, session-selected, unsupported, or unverified launches preserve the direct path.",
    "The authenticated single resident tab retains output and accepts input across detach and reattach without exposing tab credentials to extensions or child processes.",
    "Isolated Windows evidence passes terminal closure, Windows OpenSSH loss, retained output, reattach input, double-`Ctrl+C`, `/quit`, empty-editor `Ctrl+D`, and forced attach loss with a usable parent shell.",
    "Native Windows x64, macOS arm64, and Linux x64 role integration passes launch-tree loss, retained output, reattach input, exclusive attachment, mode restoration, and cold holder adoption.",
    "Physical macOS and Linux terminal/`sshd` evidence is explicitly uncertified and deferred to milestone 6; CI results are not relabeled as physical evidence."
  ],
  "archiveDigest": "2818a6352efb720f5f17c7e6ef4e5670c56e2f16a92ae954f52aa8876a37d986",
  "specDigest": "0416b99d65975def77a02e26a25ec9dbb33e2986abc4ff6124aaa83e2a9a51bb",
  "tasksDigest": "c78cfa8f71e840f213ffdbd09209a1c33e964057285d4753bd1544c418fd311a",
  "evidenceDigest": "85d86d538df366c5a1abbd58d64d12e3fcfd9781016420566ccbf2144107612c",
  "knownGaps": []
}
```
