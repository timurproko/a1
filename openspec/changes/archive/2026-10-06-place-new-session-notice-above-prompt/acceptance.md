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
  "specBaseSha": "44a4dbf13767a0e3e92bdc63feeaf2181a4658eb",
  "acceptanceScenarios": [
    "Bare A1 shows `✓ New session started` directly above the idle input instead of at the top of an empty transcript.",
    "The prompt-adjacent confirmation retains its accent styling, wording, wrapping, and horizontal padding with exactly one blank row before the input.",
    "The confirmation remains outside selectable, copyable, navigable, and persisted transcript content.",
    "The first accepted prompt replaces the confirmation with `Working…` without displaying both messages together.",
    "Ordinary dock notices and pre-work prompt failures retain their existing truthful presentation.",
    "The `a1 pi` route retains its chronological transcript-bound new-session confirmation."
  ],
  "archiveDigest": "f6c45d4f2608eb321c56f0328ace7a7fce4fd20e657b49a124516386c66a885c",
  "specDigest": "4e37ef19e2fcb1656c56b6e6aa87749dfdbe3c42e1101242aa2cda06dfaa11bd",
  "tasksDigest": "2b6651b3c811ff9da27e027688904699fccd7fdd8945f83802bae40238ef57d8",
  "evidenceDigest": "f41797a4441dc5491d075ddb1650db0b91ecbbe07dad3b55f999223ffb76fc63",
  "knownGaps": []
}
```
