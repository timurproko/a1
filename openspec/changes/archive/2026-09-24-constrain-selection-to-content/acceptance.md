# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A selection started in transcript content stops at the content boundary when dragged or held over the editor/footer, including at the document scroll limit.
- Transcript-originated paint and copied visible text exclude pinned editor, widget, notice, footer, and padding rows in both scroll directions.
- A pinned sticky prompt starts no selection when pressed and is neither painted nor copied by a crossing selection, while the prompt stays selectable at its document row.
- A retained selection shrinks and disappears as its source rows scroll above or below the content frame, without moving onto pinned or dock rows.
- The scroll-to-bottom control stays drawn above a selected row, and its label is absent from copied text.
- Resting the pointer on the final content row does not auto-scroll; moving below it scrolls one row per 30-millisecond tick at normal speed.
- Selecting or clicking in the editor or footer leaves the transcript position unchanged, while dock-originated selection keeps its existing behavior.

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
    "A pinned sticky prompt starts no selection when pressed and is neither painted nor copied by a crossing selection, while the prompt stays selectable at its document row.",
    "A retained selection shrinks and disappears as its source rows scroll above or below the content frame, without moving onto pinned or dock rows.",
    "The scroll-to-bottom control stays drawn above a selected row, and its label is absent from copied text.",
    "Resting the pointer on the final content row does not auto-scroll; moving below it scrolls one row per 30-millisecond tick at normal speed.",
    "Selecting or clicking in the editor or footer leaves the transcript position unchanged, while dock-originated selection keeps its existing behavior."
  ],
  "archiveDigest": "0df4f1bde9fb145b1d067b4f334f3e1bb2148bcb403deb1067657ddab6a7661c",
  "specDigest": "95ce8be665576b0c8cacfc2672f3e19324f365230b84bf085e713b7ce1bb9009",
  "tasksDigest": "d29a617f395c076be7589740c96eb267d3ecb783b6effbb193cced9f55e6b851",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
