# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The Agent settings screen persists a live prompt image limit from 1 through 16 and defaults existing profiles to 8.
- Paste admission and ordinary or queued submission preparation enforce the current limit, while the command contract rejects more than 16 attachments.
- Count feedback names the effective image limit, directs users to `/settings`, and renders as a warning rather than an error.
- Correcting an over-limit draft retires only its active image-count warning and never retries failed overflow images.
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
  "specBaseSha": "bd9f3e5baadfe2dca77e7158fc8f03cabec4cb11",
  "acceptanceScenarios": [
    "The Agent settings screen persists a live prompt image limit from 1 through 16 and defaults existing profiles to 8.",
    "Paste admission and ordinary or queued submission preparation enforce the current limit, while the command contract rejects more than 16 attachments.",
    "Count feedback names the effective image limit, directs users to `/settings`, and renders as a warning rather than an error.",
    "Correcting an over-limit draft retires only its active image-count warning and never retries failed overflow images.",
    "Settings-free and `a1 pi` comparison sessions retain the fixed eight-image behavior."
  ],
  "archiveDigest": "ddc9800b1b2aef736c41ea840c28bc064d1b0d372b8c52a92b4d4e5f4c55f9df",
  "specDigest": "b29dec1d2bd7f9cc7975390f5477cb349d236946043d9c357d97ec68e5660f72",
  "tasksDigest": "8fc9c6b8b10c4b0fb0e886fac43300a643e2ae12b88cd82c1744a6dff0ed78e6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
