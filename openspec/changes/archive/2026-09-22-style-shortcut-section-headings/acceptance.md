# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1’s keyboard-shortcut section headers use the same bold yellow heading role as Settings and align with the main title’s one-cell left inset.
- One blank row separates the main title from the first section, while every section table starts immediately below its header.
- The active keyboard-shortcut section header remains pinned while its rows scroll and yields to the next section through shared grouped layout.
- Shortcut sections are data-driven while bindings, optional extension rows, wrapping, reference-screen controls, changelog presentation, and `a1 pi` remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "style-shortcut-section-headings",
  "sourcePr": 535,
  "archive": "openspec/changes/archive/2026-09-22-style-shortcut-section-headings/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-style-shortcut-section-headings/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "12d29445f57981756cfadb7bafcfabfbcbe626bc",
  "acceptanceScenarios": [
    "Bare A1’s keyboard-shortcut section headers use the same bold yellow heading role as Settings and align with the main title’s one-cell left inset.",
    "One blank row separates the main title from the first section, while every section table starts immediately below its header.",
    "The active keyboard-shortcut section header remains pinned while its rows scroll and yields to the next section through shared grouped layout.",
    "Shortcut sections are data-driven while bindings, optional extension rows, wrapping, reference-screen controls, changelog presentation, and `a1 pi` remain unchanged."
  ],
  "archiveDigest": "16991fb48f3c8af856dd98835225d95fde0ddc83de734c10e95f3e23f8b879a6",
  "specDigest": "2813c517c9be4bedc236e7184c86398656d16ec9f137916b9bbbd456f58efda0",
  "tasksDigest": "32915bbe77223bd6123413546b7be3f7515bac5952c944865f710ce5347c3ed1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
