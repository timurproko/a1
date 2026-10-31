# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- On macOS or Linux with a root-owned npm prefix, the documented installer command installs A1 under `~/.local` without sudo or npm configuration changes.
- When `~/.local/bin` is not on PATH, the login shell's startup file gains one marked PATH line, a rerun never duplicates it, and the installer prints `a1 successfully installed; open a new terminal to use it`.
- An existing `a1` launcher in the unwritable npm prefix stops the installer with `installation failed: another command takes precedence` before any mutation.
- Rerunning the installer updates the existing per-user installation through its cancellation-safe updater.
- `a1 update` updates a per-user installation and keeps npm's Unix symlink launcher, and a symlink resolving anywhere else is still refused.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "install-without-writable-npm-prefix",
  "sourcePr": 856,
  "archive": "openspec/changes/archive/2026-10-31-install-without-writable-npm-prefix/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-31-install-without-writable-npm-prefix/acceptance.md",
  "finalizedDate": "2026-10-31",
  "specBaseSha": "964ff530e4687e638ccb97af526da00ec2b8265a",
  "acceptanceScenarios": [
    "On macOS or Linux with a root-owned npm prefix, the documented installer command installs A1 under `~/.local` without sudo or npm configuration changes.",
    "When `~/.local/bin` is not on PATH, the login shell's startup file gains one marked PATH line, a rerun never duplicates it, and the installer prints `a1 successfully installed; open a new terminal to use it`.",
    "An existing `a1` launcher in the unwritable npm prefix stops the installer with `installation failed: another command takes precedence` before any mutation.",
    "Rerunning the installer updates the existing per-user installation through its cancellation-safe updater.",
    "`a1 update` updates a per-user installation and keeps npm's Unix symlink launcher, and a symlink resolving anywhere else is still refused."
  ],
  "archiveDigest": "59b0046bc074b38cc8ec7cef3acdb5a35bb95c0274ac7d192e1edb47fa3562ff",
  "specDigest": "6f3928d272bcb659d75d1e113c3f2990538f4866943601f00c1bbf63cb55d115",
  "tasksDigest": "e893b86875ea10ebf7b864d03452a74ac505138b76dd2859a84a6eeed98c34a9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
