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
  "specBaseSha": "1f653bd4772106656a89c9be57558c211474a23c",
  "acceptanceScenarios": [
    "Every A1-rendered dismissible dialog now presents one final `Esc close` shortcut entry.",
    "Narrow clipped surfaces reserve the complete close suffix whenever it fits.",
    "Session Tree, Resume Session, authentication, and cancellable operation states retain their existing dismissal and restoration behavior.",
    "Implicit Ctrl+C aliases remain undisclosed, while the pinned `a1 pi` comparison presentation remains unchanged.",
    "Modal inventory, source provenance, and focused lifecycle coverage now guard the canonical wording."
  ],
  "archiveDigest": "13d81fd33a44b1091afb31f0fbdad9977fa615db99b0e3facd07651aa1d682cf",
  "specDigest": "7a9cfdf3d96196c1df4f261e653d9df26a4931ccae48778764cab37e3ad3e52e",
  "tasksDigest": "888135eb1a61d57f31c7ad54a1e662310f5f549515c62cf343f57a875c7adc00",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
