# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Every A1-rendered dismissible dialog now presents one final `Esc close` shortcut entry.
- Narrow clipped surfaces reserve the complete close suffix whenever it fits.
- Session Tree, Resume Session, authentication, and cancellable operation states retain their existing dismissal and restoration behavior.
- Implicit Ctrl+C aliases remain undisclosed, while the pinned `a1 pi` comparison presentation remains unchanged.
- Modal inventory, source provenance, and focused lifecycle coverage now guard the canonical wording.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-dialog-close-hints",
  "sourcePr": 695,
  "archive": "openspec/changes/archive/2026-10-06-unify-dialog-close-hints/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-unify-dialog-close-hints/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "f3d4a7f61da672b3996d3deea3f341b40ed305ff",
  "acceptanceScenarios": [
    "Every A1-rendered dismissible dialog now presents one final `Esc close` shortcut entry.",
    "Narrow clipped surfaces reserve the complete close suffix whenever it fits.",
    "Session Tree, Resume Session, authentication, and cancellable operation states retain their existing dismissal and restoration behavior.",
    "Implicit Ctrl+C aliases remain undisclosed, while the pinned `a1 pi` comparison presentation remains unchanged.",
    "Modal inventory, source provenance, and focused lifecycle coverage now guard the canonical wording."
  ],
  "archiveDigest": "13d81fd33a44b1091afb31f0fbdad9977fa615db99b0e3facd07651aa1d682cf",
  "specDigest": "9bfc781b5a2daf58e6f14d95f426945699ad0d4b65e6ccd4efe04edfc6b65ad9",
  "tasksDigest": "888135eb1a61d57f31c7ad54a1e662310f5f549515c62cf343f57a875c7adc00",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
