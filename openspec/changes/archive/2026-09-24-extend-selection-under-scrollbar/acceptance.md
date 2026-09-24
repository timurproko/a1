# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A transcript selection that reaches the right edge paints continuously through the final-column gutter while visible scrollbar glyphs remain above it.
- A selection ending before the final source grapheme leaves both that grapheme and the gutter on their ordinary row background.
- Selected text and clipboard output exclude gutter padding and scrollbar glyphs across automatic, always-visible, and hidden scrollbar modes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extend-selection-under-scrollbar",
  "sourcePr": 585,
  "archive": "openspec/changes/archive/2026-09-24-extend-selection-under-scrollbar/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-extend-selection-under-scrollbar/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "4920eed828387e598c69b09182f658e723e48b55",
  "acceptanceScenarios": [
    "A transcript selection that reaches the right edge paints continuously through the final-column gutter while visible scrollbar glyphs remain above it.",
    "A selection ending before the final source grapheme leaves both that grapheme and the gutter on their ordinary row background.",
    "Selected text and clipboard output exclude gutter padding and scrollbar glyphs across automatic, always-visible, and hidden scrollbar modes."
  ],
  "archiveDigest": "4e520037f8300ff5745f90adb4268e52331486d905e8779559d2f429815568d2",
  "specDigest": "639fa6e7e05e935c19ae2c29f412f135f101aff9b4251a6f3e82c7a930da8dfa",
  "tasksDigest": "56a6074b9aa2aa4248ef7a6b3a51b73a049ebe7e455243824786da2d4e37aaf8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
