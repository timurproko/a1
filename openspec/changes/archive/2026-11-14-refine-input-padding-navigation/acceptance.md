# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ctrl+Shift+Up/Down jumps between Settings sections and Agent prompt or compaction anchors without changing the draft.
- Shift-only and Ctrl-only arrows no longer trigger section or transcript jumps, and shortcut hints show the new chords.
- Agent drafts and Settings search retain one-cell left and right gutters across every editable row, including multiline continuations.
- Carets, selection, pointer targeting, and autocomplete follow the shared inset while rules remain full width and copied text excludes gutters.
- Larger configured editor padding remains supported without duplicate gutters, and the independent Pi comparison route is unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refine-input-padding-navigation",
  "sourcePr": 925,
  "archive": "openspec/changes/archive/2026-11-14-refine-input-padding-navigation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-refine-input-padding-navigation/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "c362c4e8e21bf82ad6844dbf51ba9caf4920604a",
  "acceptanceScenarios": [
    "Ctrl+Shift+Up/Down jumps between Settings sections and Agent prompt or compaction anchors without changing the draft.",
    "Shift-only and Ctrl-only arrows no longer trigger section or transcript jumps, and shortcut hints show the new chords.",
    "Agent drafts and Settings search retain one-cell left and right gutters across every editable row, including multiline continuations.",
    "Carets, selection, pointer targeting, and autocomplete follow the shared inset while rules remain full width and copied text excludes gutters.",
    "Larger configured editor padding remains supported without duplicate gutters, and the independent Pi comparison route is unchanged."
  ],
  "archiveDigest": "d4b8da23e67ce98e7ad434b2b40150d613f65215a807261ce7e226ff6d894b69",
  "specDigest": "bed2314644cbaf63e3b5771bb0dacc6075afd948329e565e172abd8e244aa3b6",
  "tasksDigest": "b71362e54626d458eb00843a8557570158aa5effc916ea247329827a8be018c8",
  "evidenceDigest": "471fa703d0f633885b04843997911a289182da3b874ef76f53ba23df660cb649",
  "knownGaps": []
}
```
