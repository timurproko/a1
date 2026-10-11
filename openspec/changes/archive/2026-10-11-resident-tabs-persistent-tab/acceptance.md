# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- `residentTabs` remains disabled by default, and disabled, comparison, session-selected, unsupported, or unverified launches preserve the direct path.
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
    "`residentTabs` remains disabled by default, and disabled, comparison, session-selected, unsupported, or unverified launches preserve the direct path.",
    "The authenticated single resident tab retains output and accepts input across detach and reattach without exposing tab credentials to extensions or child processes.",
    "Isolated Windows evidence passes terminal closure, Windows OpenSSH loss, retained output, reattach input, double-`Ctrl+C`, `/quit`, empty-editor `Ctrl+D`, and forced attach loss with a usable parent shell.",
    "Native Windows x64, macOS arm64, and Linux x64 role integration passes launch-tree loss, retained output, reattach input, exclusive attachment, mode restoration, and cold holder adoption.",
    "Physical macOS and Linux terminal/`sshd` evidence is explicitly uncertified and deferred to milestone 6; CI results are not relabeled as physical evidence."
  ],
  "archiveDigest": "e8879e2ec24dfa23f6e89e4eae35bc8849a60b4bad67080aee0926300fd0fe6c",
  "specDigest": "b4c7499f68a510cd386f1049dadc9d06e7482f285f8864cf939f0e04d54afee8",
  "tasksDigest": "a052bf86f19ebc8d1f80f0723e48049615f297c832d0e4c869127af141cb1b17",
  "evidenceDigest": "85d86d538df366c5a1abbd58d64d12e3fcfd9781016420566ccbf2144107612c",
  "knownGaps": []
}
```
