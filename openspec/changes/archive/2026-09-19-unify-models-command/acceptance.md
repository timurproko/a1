# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In bare A1, `/models` opens one dialog titled `Models` with `all`/`scoped` filters and search; each row shows the scope marker, the model id, `[provider]`, and then the active checkmark; `/model` and `/scoped-models` are no longer advertised or routed.
- Space changes the session scope without saving and shows `Models (unsaved)`; Ctrl+S persists it and clears the marker only on success; Enter switches and persists the default model, closes the dialog, and shows the confirmation notice.
- `a1 pi` keeps its pinned `/model` and `/scoped-models` dialogs and messages unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-models-command",
  "sourcePr": 475,
  "archive": "openspec/changes/archive/2026-09-19-unify-models-command/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-unify-models-command/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "1d3f1bd6958cc265ec651368b308c1a06605d321",
  "acceptanceScenarios": [
    "In bare A1, `/models` opens one dialog titled `Models` with `all`/`scoped` filters and search; each row shows the scope marker, the model id, `[provider]`, and then the active checkmark; `/model` and `/scoped-models` are no longer advertised or routed.",
    "Space changes the session scope without saving and shows `Models (unsaved)`; Ctrl+S persists it and clears the marker only on success; Enter switches and persists the default model, closes the dialog, and shows the confirmation notice.",
    "`a1 pi` keeps its pinned `/model` and `/scoped-models` dialogs and messages unchanged."
  ],
  "archiveDigest": "be5b3819c8034c4a66f24f06ab49e394e79d66ffb507f11fde42d948c8adb3e8",
  "specDigest": "89e6bf4eb115ec92ef63ca82a7b8b030db0e358a431877623510fc3d97cceba0",
  "tasksDigest": "e736ea84063df0c2d2d535f09397c128367ed6f9c46dc7be2d4feb7bde03afc0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
