# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Generic fallback and package built-in collapsed tool hints display the effective expansion key as `Ctrl+O expand` by default with separate quiet-key and muted-action styling.
- Built-in preview content, omitted-line counts, custom bindings, and expansion behavior remain intact.
- Custom extension renderers and explicit `a1 pi` comparison output retain their existing presentation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "expand-shortcut-hint",
  "sourcePr": 762,
  "archive": "openspec/changes/archive/2026-10-12-expand-shortcut-hint/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-12-expand-shortcut-hint/acceptance.md",
  "finalizedDate": "2026-10-12",
  "specBaseSha": "0c771645678e69095c7722cc55f6a5e8c6b83448",
  "acceptanceScenarios": [
    "Generic fallback and package built-in collapsed tool hints display the effective expansion key as `Ctrl+O expand` by default with separate quiet-key and muted-action styling.",
    "Built-in preview content, omitted-line counts, custom bindings, and expansion behavior remain intact.",
    "Custom extension renderers and explicit `a1 pi` comparison output retain their existing presentation."
  ],
  "archiveDigest": "9e10b88269d35f5ba19b4204033eb5bfe6ce8cc4fa29ca56ee4e90230ef9c806",
  "specDigest": "e27fbb94ed364d14a3f31b889db013d70d7a22243e2b0671201c1cd3a5e58397",
  "tasksDigest": "3fef57da491a608a3aa773b6ef103df9c3f97bbf6b9d7ee7bbffde50a3443633",
  "evidenceDigest": "49bc2e3b0010956eaecc2d5c7b5e5db5ea1a7d8df98533afeea6e45bb73607dc",
  "knownGaps": []
}
```
