# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Status-bar-only selection remains highlighted on release without changing the clipboard, even when fullscreen auto-copy is enabled.
- `Ctrl+C` copies selected status-bar text and clears the retained selection.
- Mixed release copies only eligible transcript text, while explicit copy includes eligible transcript and status rows without other dock chrome.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "copy-status-bar-on-demand",
  "sourcePr": 758,
  "archive": "openspec/changes/archive/2026-10-11-copy-status-bar-on-demand/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-11-copy-status-bar-on-demand/acceptance.md",
  "finalizedDate": "2026-10-11",
  "specBaseSha": "3c1f19844654c119c154f281ae2ddc0d63a11b89",
  "acceptanceScenarios": [
    "Status-bar-only selection remains highlighted on release without changing the clipboard, even when fullscreen auto-copy is enabled.",
    "`Ctrl+C` copies selected status-bar text and clears the retained selection.",
    "Mixed release copies only eligible transcript text, while explicit copy includes eligible transcript and status rows without other dock chrome."
  ],
  "archiveDigest": "0ddf885ae2f7a9c2cc621efcaf188e9c1db5ddd778ac0b6d7c2f6159a0ac18d8",
  "specDigest": "1b42b9cfb3dbe42ec28534d2b612d9514c3e086801955a582038f1dddcd2c2a9",
  "tasksDigest": "8f48d735b2e8ac309f72175dbd6333006916a824736921d1802ca74cccc7b043",
  "evidenceDigest": "078a4423fafa178bfcbf497cafe8da3fd077e27a7aed88f7de18cadba0d47538",
  "knownGaps": []
}
```
