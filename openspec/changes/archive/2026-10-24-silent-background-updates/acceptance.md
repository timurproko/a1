# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Auto silently installs the exact verified channel update without interrupting sessions running from immutable releases.
- Notify preserves the existing update-available popup and manual installation flow.
- No performs no startup cache read or registry check while explicit update commands remain available.
- Automatic and manual package replacement share one owner and refuse malformed or conflicting state.
- Installed updates appear only as persistent restart-ready status chrome and never enter the transcript.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "silent-background-updates",
  "sourcePr": 825,
  "archive": "openspec/changes/archive/2026-10-24-silent-background-updates/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-silent-background-updates/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "63a5d9ec34bcda4632c48015cd1da0857f8ea545",
  "acceptanceScenarios": [
    "Auto silently installs the exact verified channel update without interrupting sessions running from immutable releases.",
    "Notify preserves the existing update-available popup and manual installation flow.",
    "No performs no startup cache read or registry check while explicit update commands remain available.",
    "Automatic and manual package replacement share one owner and refuse malformed or conflicting state.",
    "Installed updates appear only as persistent restart-ready status chrome and never enter the transcript."
  ],
  "archiveDigest": "fb730ae4197ee1d8d9a0b704027b41cf2dfd6081e2229d17ff91469c94e429a8",
  "specDigest": "c4c6cf24b2f0d10cbde5d16e3db2daebce7a8eb98824a60ae2b518ab829fe337",
  "tasksDigest": "c705bafcf5949e172c1bae8242dde0f5a762262ed265d8f100e9df3cafc86338",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
