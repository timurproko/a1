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
  "specBaseSha": "ff896747fedf55174cdee19e2deaaaf377dfeb90",
  "acceptanceScenarios": [
    "Every A1-rendered dismissible dialog now presents one final `Esc close` shortcut entry.",
    "Narrow clipped surfaces reserve the complete close suffix whenever it fits.",
    "Session Tree, Resume Session, authentication, and cancellable operation states retain their existing dismissal and restoration behavior.",
    "Implicit Ctrl+C aliases remain undisclosed, while the pinned `a1 pi` comparison presentation remains unchanged.",
    "Modal inventory, source provenance, and focused lifecycle coverage now guard the canonical wording."
  ],
  "archiveDigest": "15b55562e3057cc1671b2e9337c47756c28fdd7a7f8df052ceea0edd0ee992a2",
  "specDigest": "1d1b798ef88c48324b803330bdf63d489a45d104ca1ddf77deb091c0fdde30a6",
  "tasksDigest": "888135eb1a61d57f31c7ad54a1e662310f5f549515c62cf343f57a875c7adc00",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
