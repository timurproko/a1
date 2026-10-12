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
  "archiveDigest": "67299d2e3d3801a3357a474304acc488e175ff91e30b62c09818dbf8cc0dc972",
  "specDigest": "e27fbb94ed364d14a3f31b889db013d70d7a22243e2b0671201c1cd3a5e58397",
  "tasksDigest": "3fef57da491a608a3aa773b6ef103df9c3f97bbf6b9d7ee7bbffde50a3443633",
  "evidenceDigest": "817de45ae08ae0d142804a2b25ffaf847925aca5cfa5ad84e81ec6e3a5896407",
  "knownGaps": []
}
```
