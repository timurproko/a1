# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1’s keyboard-shortcut sections use the same shared accent header as Settings and place each table directly below its label.
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
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "Bare A1’s keyboard-shortcut sections use the same shared accent header as Settings and place each table directly below its label.",
    "The active keyboard-shortcut section header remains pinned while its rows scroll and yields to the next section through shared grouped layout.",
    "Shortcut sections are data-driven while bindings, optional extension rows, wrapping, reference-screen controls, changelog presentation, and `a1 pi` remain unchanged."
  ],
  "archiveDigest": "0e90b016e32628f624e88326d6ee489c3888ec815282af4eb706116a7f386caa",
  "specDigest": "f908dbf3e075fda68bd17cfe0d654723ea4e9669b2bc281059984f244f40958c",
  "tasksDigest": "934bcb1389698cc3d1fdde79716f253ad43df49a94526fe6a467f53cf6692b69",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
