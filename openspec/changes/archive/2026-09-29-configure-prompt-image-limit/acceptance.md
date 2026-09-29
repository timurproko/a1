# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The Agent settings screen persists a live prompt image limit from 1 through 16 and defaults existing profiles to 8.
- Paste admission and ordinary or queued submission preparation enforce the current limit, while the command contract rejects more than 16 attachments.
- Correcting an over-limit draft retires only its active image-count notice and never retries failed overflow images.
- Settings-free and `a1 pi` comparison sessions retain the fixed eight-image behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "configure-prompt-image-limit",
  "sourcePr": 622,
  "archive": "openspec/changes/archive/2026-09-29-configure-prompt-image-limit/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-configure-prompt-image-limit/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "f11d40df1ab428d54fd8a0acbb0e374fd584ca23",
  "acceptanceScenarios": [
    "The Agent settings screen persists a live prompt image limit from 1 through 16 and defaults existing profiles to 8.",
    "Paste admission and ordinary or queued submission preparation enforce the current limit, while the command contract rejects more than 16 attachments.",
    "Correcting an over-limit draft retires only its active image-count notice and never retries failed overflow images.",
    "Settings-free and `a1 pi` comparison sessions retain the fixed eight-image behavior."
  ],
  "archiveDigest": "372cde98bd1816e66fa4cf43e45e6664f4c391292e447b048556734697b3b99d",
  "specDigest": "4bbb2a74af42ae47764e80bd600f5ed56ba146ad1e3c01f5e9a0bad927fbcb87",
  "tasksDigest": "f8a9c4804d19d25d625235950ebf9f6d471d5609d3cb8e431794285ce150cfdb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
