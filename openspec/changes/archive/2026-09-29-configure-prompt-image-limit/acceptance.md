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
  "archiveDigest": "1fac12c595f2b8f71a84e47309852c1e3121e053d06ebb40c1b1fbad5f107b79",
  "specDigest": "8fc646dcbe91589546352f91c7bc9c9efb68353c1590b9830772671b7c153c08",
  "tasksDigest": "748711afd89932f1b9f0ee1c5ddc1f577efa3560507786bd88bcad406f7e83c9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
