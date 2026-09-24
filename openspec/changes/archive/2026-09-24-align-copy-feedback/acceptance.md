# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Selection copies now show exactly one accent-only `copied N chars to clipboard` row immediately above the editor, with replacement, clipping, and one-second expiry.
- The count comes from the immutable delivered payload; whitespace-only payloads still reach the clipboard without showing success feedback.
- Rapid, stale, failed, canceled, timed-out, and superseded completions cannot replace the newest successful acknowledgement.
- Pi's `Fullscreen copy on select` preference is visible under Agent, persists through Pi's settings manager, and changes release-time behavior live.
- Disabling automatic copy retains the selection for explicit `Ctrl+C`; semantic `/copy`, prompt copy/cut, failures, and `a1 pi` remain on their existing paths.
- Focused selection, clipboard, response-copy, workflow, settings, and terminal-paint suites pass together with the bounded PR validation tier and repository governance checks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-copy-feedback",
  "sourcePr": 575,
  "archive": "openspec/changes/archive/2026-09-24-align-copy-feedback/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-align-copy-feedback/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "4bb30e18ac3303797334847de8653c73632fafac",
  "acceptanceScenarios": [
    "Selection copies now show exactly one accent-only `copied N chars to clipboard` row immediately above the editor, with replacement, clipping, and one-second expiry.",
    "The count comes from the immutable delivered payload; whitespace-only payloads still reach the clipboard without showing success feedback.",
    "Rapid, stale, failed, canceled, timed-out, and superseded completions cannot replace the newest successful acknowledgement.",
    "Pi's `Fullscreen copy on select` preference is visible under Agent, persists through Pi's settings manager, and changes release-time behavior live.",
    "Disabling automatic copy retains the selection for explicit `Ctrl+C`; semantic `/copy`, prompt copy/cut, failures, and `a1 pi` remain on their existing paths.",
    "Focused selection, clipboard, response-copy, workflow, settings, and terminal-paint suites pass together with the bounded PR validation tier and repository governance checks."
  ],
  "archiveDigest": "8ed5c100c483c5c7231458573687bd0f7ab09f64da2bb39b4eb478fa619d3a11",
  "specDigest": "27ec77ffc1e8fd6a2b4096f246d7753b0fad60bdf4fabbd5c0552cd6be88390f",
  "tasksDigest": "aa8f039449cc0b273d37f0dde1dfe8303e465cde27c07c52a4a9b8b040fc4d7b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
