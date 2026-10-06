# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 shows `✓ New session started` directly above the idle input instead of at the top of an empty transcript.
- The prompt-adjacent confirmation retains its accent styling, wording, wrapping, padding, and surrounding blank rows.
- The confirmation remains outside selectable, copyable, navigable, and persisted transcript content.
- The first accepted prompt replaces the confirmation with `Working…` without displaying both messages together.
- Ordinary dock notices and pre-work prompt failures retain their existing truthful presentation.
- The `a1 pi` route retains its chronological transcript-bound new-session confirmation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-new-session-notice-above-prompt",
  "sourcePr": 688,
  "archive": "openspec/changes/archive/2026-10-06-place-new-session-notice-above-prompt/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-place-new-session-notice-above-prompt/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "8158cebda549493781558a73f127922e640ee2f1",
  "acceptanceScenarios": [
    "Bare A1 shows `✓ New session started` directly above the idle input instead of at the top of an empty transcript.",
    "The prompt-adjacent confirmation retains its accent styling, wording, wrapping, padding, and surrounding blank rows.",
    "The confirmation remains outside selectable, copyable, navigable, and persisted transcript content.",
    "The first accepted prompt replaces the confirmation with `Working…` without displaying both messages together.",
    "Ordinary dock notices and pre-work prompt failures retain their existing truthful presentation.",
    "The `a1 pi` route retains its chronological transcript-bound new-session confirmation."
  ],
  "archiveDigest": "1941922c25e39deee74588731bf458e45e332c76a29d09b96b8dcea615de19f9",
  "specDigest": "ca11df2a0eaabac411e5095dcc7b1b1b4f460eac32f4c9e3e54dcf97681c118a",
  "tasksDigest": "bd189ab075b31f86817949455fb633003261ed9347c43f6388aaf25b6cdb932f",
  "evidenceDigest": "c495a6be68ec72b3c63072ae6c6339a3b25a7cf1a907b75f470f76ea81f90147",
  "knownGaps": []
}
```
