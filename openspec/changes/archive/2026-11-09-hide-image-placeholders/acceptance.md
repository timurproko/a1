# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Hidden user and tool images leave no automatic image placeholder or image-only spacing in the transcript.
- Screenshot labels, ordinary text, custom renderer content, and original attachments remain intact when images are hidden.
- Re-enabling images restores retained attachments in supported terminals, and enabled rendering failures keep their diagnostics.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hide-image-placeholders",
  "sourcePr": 895,
  "archive": "openspec/changes/archive/2026-11-09-hide-image-placeholders/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-09-hide-image-placeholders/acceptance.md",
  "finalizedDate": "2026-11-09",
  "specBaseSha": "21ddae82f41050780691f3a7edf1ee0d07b29f98",
  "acceptanceScenarios": [
    "Hidden user and tool images leave no automatic image placeholder or image-only spacing in the transcript.",
    "Screenshot labels, ordinary text, custom renderer content, and original attachments remain intact when images are hidden.",
    "Re-enabling images restores retained attachments in supported terminals, and enabled rendering failures keep their diagnostics."
  ],
  "archiveDigest": "14cb82870a4a48e0cca4fdbf09e5e8686c9c3a889a1c287e5ad580a04d9c648e",
  "specDigest": "930ce27f32b09aff45d41a959f2cfba0a7f63073c2258f16f8afe7671c4eeabd",
  "tasksDigest": "0759d97a9a690d507f3ffbb48bb8e6c643d2038afae89c0861147cbd24d5cd77",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
