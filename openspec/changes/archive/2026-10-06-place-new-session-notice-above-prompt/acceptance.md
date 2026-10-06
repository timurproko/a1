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
  "specBaseSha": "99e849aca28c25b645cb50008d3427f4fdb2a050",
  "acceptanceScenarios": [
    "Bare A1 shows `✓ New session started` directly above the idle input instead of at the top of an empty transcript.",
    "The prompt-adjacent confirmation retains its accent styling, wording, wrapping, padding, and surrounding blank rows.",
    "The confirmation remains outside selectable, copyable, navigable, and persisted transcript content.",
    "The first accepted prompt replaces the confirmation with `Working…` without displaying both messages together.",
    "Ordinary dock notices and pre-work prompt failures retain their existing truthful presentation.",
    "The `a1 pi` route retains its chronological transcript-bound new-session confirmation."
  ],
  "archiveDigest": "ed04ba1d09a93288dc7944f646a979f8a8dc197d35ef8a37c97f4f98eff67ca0",
  "specDigest": "ca11df2a0eaabac411e5095dcc7b1b1b4f460eac32f4c9e3e54dcf97681c118a",
  "tasksDigest": "bd189ab075b31f86817949455fb633003261ed9347c43f6388aaf25b6cdb932f",
  "evidenceDigest": "42fa05d93addcd426a6868d55983a415532706cc2a1df4699969bb5beabeb167",
  "knownGaps": []
}
```
