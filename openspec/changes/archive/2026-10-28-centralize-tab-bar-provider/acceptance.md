# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every registered resident tab kind uses the provider-backed activation and capability contract, with newly created or newly shown tabs appended after the visible order.
- Prompt selection preserves existing clipboard content for replacement paste while explicit copy, cut, and complete-frame copy-on-select remain available.
- Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.
- Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.
- Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.
- Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.
- A newly started Agent retains its complete startup preview and hidden child cursor across blank child frames, then switches atomically to the first nonblank UI or an explicit failure presentation.
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
    "A newly started Agent retains its complete startup preview and hidden child cursor across blank child frames, then switches atomically to the first nonblank UI or an explicit failure presentation.",
    "With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.",
    "Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.",
    "A drag beginning in the prompt stays editor-owned: Ctrl+C copies it; Ctrl+X cuts it; wrapped text and atomic chips behave likewise; no last-agent notice appears. Ctrl+X copies a non-editable frame selection and falls back to the last agent message only without a selection."
  ],
  "archiveDigest": "3111379cd0be6ec93bc28d60be40aacd3ac300bac8632a2585ca687cde8196b9",
  "specDigest": "45610d5e3454e4a677d425efd7c5aab5d34afed2495db158b82c6a116699b106",
  "tasksDigest": "e271688e4b2174dfd9d8a35f53f2e605096bf858b2cc95f42181946a166390dd",
  "evidenceDigest": "7b89089f9e3d00c9aa4c5386def57355f9e2e5ae5600cb116783c59c6cf3c4fa",
  "knownGaps": []
}
```
