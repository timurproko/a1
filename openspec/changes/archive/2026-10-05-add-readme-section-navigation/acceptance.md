# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Install, Launch, Update, Extensions, Develop, and Publish links jump to matching top-level sections in document order.
- Every primary section boundary uses the same theme-aware animated `* * *` separator.
- Reduced-motion preferences show static separators, and the animated waves footer remains present.
- Command examples render without shell-keyword coloring while preserving their command text.
- Local preview fragments scroll the generated preview while repository-relative images continue loading from the checkout.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-readme-section-navigation",
  "sourcePr": 678,
  "archive": "openspec/changes/archive/2026-10-05-add-readme-section-navigation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-add-readme-section-navigation/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "386f376c5ffc8d47d386b4cbe5492d02beecc84c",
  "acceptanceScenarios": [
    "Install, Launch, Update, Extensions, Develop, and Publish links jump to matching top-level sections in document order.",
    "Every primary section boundary uses the same theme-aware animated `* * *` separator.",
    "Reduced-motion preferences show static separators, and the animated waves footer remains present.",
    "Command examples render without shell-keyword coloring while preserving their command text.",
    "Local preview fragments scroll the generated preview while repository-relative images continue loading from the checkout."
  ],
  "archiveDigest": "64d5cdb667c676df9a6354a75c9d996acdc14d3e338505e2d44b75bcbf2bb29c",
  "specDigest": "89c0e2b3307d174824c45a9923c51363f6bf000bdce55652cc1adb24344c7916",
  "tasksDigest": "e56e6be143eb45f8246d6bb4f376107b25214e6a08e9a37bb69cc8dccba34521",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
