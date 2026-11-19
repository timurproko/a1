# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A public branch pull request appears as its canonical linked footer badge when GitHub CLI is unavailable.
- Successful GitHub CLI discovery remains preferred, while malformed, ambiguous, closed-unmerged, failed, or cancelled fallback results remain silent.
- Optional GitHub credentials stay confined to the API authorization header, and fallback-only code remains outside eager startup.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "support-pr-rest-fallback",
  "sourcePr": 592,
  "archive": "openspec/changes/archive/2026-09-25-support-pr-rest-fallback/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-support-pr-rest-fallback/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "251564e2db19a68af4d6ae5e1cc81c10f0d3455d",
  "acceptanceScenarios": [
    "A public branch pull request appears as its canonical linked footer badge when GitHub CLI is unavailable.",
    "Successful GitHub CLI discovery remains preferred, while malformed, ambiguous, closed-unmerged, failed, or cancelled fallback results remain silent.",
    "Optional GitHub credentials stay confined to the API authorization header, and fallback-only code remains outside eager startup."
  ],
  "archiveDigest": "169524748a6f18241268e94106c81880cabc06e19148b215bccd51aed437629d",
  "specDigest": "9f2ea5e53cd8a01c5d4c807aafc38c3c2c0023661fe633ce8b073057055b1d4c",
  "tasksDigest": "8c43721a8256f55be8555d4fe623be597ea190a2f0185bd1ef981a004620c3d2",
  "evidenceDigest": "2b6b34e312efb3d23c8f9e34a6ebec5216dcb59c13108b5cec6d30466a12f49a",
  "knownGaps": []
}
```
