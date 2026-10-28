# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every registered resident tab kind uses the provider-backed activation and capability contract, with newly created or newly shown tabs appended after the visible order.
- Prompt selection preserves existing clipboard content for replacement paste and stays visually selected until that paste commits; explicit copy, cut, and complete-frame copy-on-select remain available.
- Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.
- Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.
- Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.
- Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.
- A newly started Agent retains its complete startup preview across blank child frames; quick, prolonged, and inactive-tab resizes repaint directly without a resize overlay or fade.
- With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.
- Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.
- Prompt drags stay editor-owned: Ctrl+C copies and Ctrl+X cuts, including wrapped text and chips. Ctrl+X copies a frame selection without a last-agent notice. With no selection, last-message copy is silent and leaves the clipboard untouched when empty; nonempty copy keeps its acknowledgement.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "centralize-tab-bar-provider",
  "sourcePr": 847,
  "archive": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/acceptance.md",
  "finalizedDate": "2026-10-28",
  "specBaseSha": "81d81ade9416f501305300eafaafd2972b0efafb",
  "acceptanceScenarios": [
    "Every registered resident tab kind uses the provider-backed activation and capability contract, with newly created or newly shown tabs appended after the visible order.",
    "Prompt selection preserves existing clipboard content for replacement paste and stays visually selected until that paste commits; explicit copy, cut, and complete-frame copy-on-select remain available.",
    "Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.",
    "Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.",
    "Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.",
    "Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.",
    "A newly started Agent retains its complete startup preview across blank child frames; quick, prolonged, and inactive-tab resizes repaint directly without a resize overlay or fade.",
    "With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.",
    "Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.",
    "Prompt drags stay editor-owned: Ctrl+C copies and Ctrl+X cuts, including wrapped text and chips. Ctrl+X copies a frame selection without a last-agent notice. With no selection, last-message copy is silent and leaves the clipboard untouched when empty; nonempty copy keeps its acknowledgement."
  ],
  "archiveDigest": "bdb719e86eba22999db56814563107f4037374d5df9a43c614ba5661ee2355a6",
  "specDigest": "7b010ad21f9466419b0a06d59c02b4899f78021038ded17fa2c63a832c37a739",
  "tasksDigest": "1abe740cd716c3b0656d412b55062aea820e4056e83af0fc25f891ac8b1114a4",
  "evidenceDigest": "febadbd6c854cf749d83e216d0fb81e0861387ebc26eddbbd03c4c6f003772d8",
  "knownGaps": []
}
```
