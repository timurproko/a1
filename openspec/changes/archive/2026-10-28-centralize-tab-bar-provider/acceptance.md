# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every registered resident tab kind uses the provider-backed activation and capability contract, with newly created or newly shown tabs appended after the visible order.
- Prompt selection preserves existing clipboard content for replacement paste while explicit copy, cut, and complete-frame copy-on-select remain available.
- Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.
- Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.
- Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.
- Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.
- A newly started Agent retains its complete startup preview across blank child frames; quick or background terminal resizes repaint directly, while only prolonged focused resizing shows the curtain and its fade.
- With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.
- Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.
- A drag beginning in the prompt stays editor-owned: Ctrl+C copies it; Ctrl+X cuts it; wrapped text and atomic chips behave likewise; no last-agent notice appears. Ctrl+X copies a non-editable frame selection and falls back to the last agent message only without a selection.

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
    "Prompt selection preserves existing clipboard content for replacement paste while explicit copy, cut, and complete-frame copy-on-select remain available.",
    "Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.",
    "Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.",
    "Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.",
    "Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.",
    "A newly started Agent retains its complete startup preview across blank child frames; quick or background terminal resizes repaint directly, while only prolonged focused resizing shows the curtain and its fade.",
    "With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.",
    "Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.",
    "A drag beginning in the prompt stays editor-owned: Ctrl+C copies it; Ctrl+X cuts it; wrapped text and atomic chips behave likewise; no last-agent notice appears. Ctrl+X copies a non-editable frame selection and falls back to the last agent message only without a selection."
  ],
  "archiveDigest": "b717d0c4fe2ec05e88a81fd8a48a757b3621f8cef768d42623ff59c31da23eeb",
  "specDigest": "c73ed008d422f4b104be98bdf20005a8450d68e0847921b50c9f24402b8776f0",
  "tasksDigest": "275060756920519b8e7283ede1f1e3e5539f000be95cb8ba5a1d1135809b2bbe",
  "evidenceDigest": "ea8dee0a28ccf2a86ed594594415e248a1b3fcca47b9de0c66ce93ddc2093f30",
  "knownGaps": []
}
```
