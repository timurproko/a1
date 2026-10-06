# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 shows `✓ New session started` directly above the idle input instead of at the top of an empty transcript.
- The prompt-adjacent confirmation retains its accent styling, wording, wrapping, and horizontal padding with exactly one blank row before the input.
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
    "The prompt-adjacent confirmation retains its accent styling, wording, wrapping, and horizontal padding with exactly one blank row before the input.",
    "The confirmation remains outside selectable, copyable, navigable, and persisted transcript content.",
    "The first accepted prompt replaces the confirmation with `Working…` without displaying both messages together.",
    "Ordinary dock notices and pre-work prompt failures retain their existing truthful presentation.",
    "The `a1 pi` route retains its chronological transcript-bound new-session confirmation."
  ],
  "archiveDigest": "0678b6d3db3ac9cbc543f86006bd772efc327eb9cb9c524a4987b7a841742e09",
  "specDigest": "4e37ef19e2fcb1656c56b6e6aa87749dfdbe3c42e1101242aa2cda06dfaa11bd",
  "tasksDigest": "2b6651b3c811ff9da27e027688904699fccd7fdd8945f83802bae40238ef57d8",
  "evidenceDigest": "c59848dc80bb21565c7780c7d8a25ee2fb07dc2a7ab89aa748d4af34e2de5ce1",
  "knownGaps": []
}
```
