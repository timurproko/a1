# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A selection started in transcript content stops at the content boundary when dragged or held over the editor/footer, including at the document scroll limit.
- Transcript-originated paint and copied visible text exclude pinned editor, widget, notice, footer, and padding rows in both scroll directions.
- A gesture started in the dock retains its existing selection behavior without changing editor-local ownership.
- Dock reflow and scrollbar-edge presentation preserve the bounded content selection without stale paint or changed rail semantics.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "constrain-selection-to-content",
  "sourcePr": 587,
  "archive": "openspec/changes/archive/2026-09-24-constrain-selection-to-content/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-constrain-selection-to-content/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "ace560033b5bd0dda5218e9a6b6842a510103383",
  "acceptanceScenarios": [
    "A selection started in transcript content stops at the content boundary when dragged or held over the editor/footer, including at the document scroll limit.",
    "Transcript-originated paint and copied visible text exclude pinned editor, widget, notice, footer, and padding rows in both scroll directions.",
    "A gesture started in the dock retains its existing selection behavior without changing editor-local ownership.",
    "Dock reflow and scrollbar-edge presentation preserve the bounded content selection without stale paint or changed rail semantics."
  ],
  "archiveDigest": "6e2b22068c88babed3ab5aa74ddf424ff16a4e29b68e10f7b32288f1c2101324",
  "specDigest": "a1e8359a63d4b11f00c3e5b6387f1f3e13400db1ad75c72a7e9505ff7139522c",
  "tasksDigest": "3ff61eac0f59dcf914b06df980a4d07728270ca6a89f1d1a6ee9a7adf4aa88d2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
