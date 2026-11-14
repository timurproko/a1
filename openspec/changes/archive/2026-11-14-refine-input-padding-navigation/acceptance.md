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
  "archiveDigest": "32b2f04665048737cbc470cbdb58523787c703da2002710c9e7517d0f2d9de4f",
  "specDigest": "bed2314644cbaf63e3b5771bb0dacc6075afd948329e565e172abd8e244aa3b6",
  "tasksDigest": "b71362e54626d458eb00843a8557570158aa5effc916ea247329827a8be018c8",
  "evidenceDigest": "441e057a3aa95688c5c3e58dd892ea26b8f17235e4fca7f6e2ca0626824981b1",
  "knownGaps": []
}
```
