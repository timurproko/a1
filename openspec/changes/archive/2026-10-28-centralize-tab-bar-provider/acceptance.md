# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every registered resident tab kind uses the provider-backed activation and capability contract, with newly created or newly shown tabs appended after the visible order.
- Prompt selection preserves existing clipboard content for replacement paste while explicit copy, cut, and complete-frame copy-on-select remain available.
- Commands and Plus Menu render shared semantic key-and-action hints with two-space gaps, distinct key/action roles, fallback colors, and width-safe clipping.
- Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu use one centered panel over a dimmed Settings backdrop while retaining navigation, search, editing, undo, persistence, and compact-terminal guidance.
- Agent frame, prompt, Settings search, Changelog, and What's New selection use one component-owned blue surface while preserving ANSI styling, links, graphemes, atomic-chip focus, and theme-owned row highlights; Changelog and What's New retain drag, word, line, automatic copy, and Ctrl+C behavior.
- Every centered Settings configure dialog uses the native-matching RGB 38,38,38 or ANSI 235 surface, while ordinary value menus retain their established raised background.
- A newly started Agent retains its complete startup preview across blank child frames; quick, prolonged, and inactive-tab resizes repaint directly without a resize overlay or fade.
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
    "A newly started Agent retains its complete startup preview across blank child frames; quick, prolonged, and inactive-tab resizes repaint directly without a resize overlay or fade.",
    "With Copy on select enabled, completing a Changelog or What's New selection shows the same copied-character clipboard acknowledgement as session selection.",
    "Overflowing scrollbar thumbs use at least two terminal rows on tracks that can fit them, while one-row tracks remain bounded and drag, paging, and end-position geometry stay correct.",
    "A drag beginning in the prompt stays editor-owned: Ctrl+C copies it; Ctrl+X cuts it; wrapped text and atomic chips behave likewise; no last-agent notice appears. Ctrl+X copies a non-editable frame selection and falls back to the last agent message only without a selection."
  ],
  "archiveDigest": "71c30e46a2bf43bb15b2c37e8787521a784410ae9cc0b214a6d3b0ed5a227172",
  "specDigest": "f3f0b32f4c236dc0b3c3e3e553838590eee427e50f265982e1bfff6d83defcae",
  "tasksDigest": "a96a8667c7342b6f6ace268335090844030d0456442eba3fcdd53206d14290d8",
  "evidenceDigest": "a16c6860f105fd1f61b2a860cb2841e1d81cf8d392b7be0dce5a9f2c09bcc3ba",
  "knownGaps": []
}
```
