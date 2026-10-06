# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Filled Models scope markers use the same accent color as Thinking Level's filled default marker on selected and unselected rows.
- Empty scope markers remain dim while active-model checkmarks remain success-colored.
- Model filtering, scope changes, persistence, active selection, and row layout remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "accent-model-scope-markers",
  "sourcePr": 696,
  "archive": "openspec/changes/archive/2026-10-06-accent-model-scope-markers/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-accent-model-scope-markers/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "457def6c1fbb7d1f045c715fc7c6d5adf8313f64",
  "acceptanceScenarios": [
    "Filled Models scope markers use the same accent color as Thinking Level's filled default marker on selected and unselected rows.",
    "Empty scope markers remain dim while active-model checkmarks remain success-colored.",
    "Model filtering, scope changes, persistence, active selection, and row layout remain unchanged."
  ],
  "archiveDigest": "47863f34553e73238fe79b532a09077388e4a09936c4864321dc9e40be2135c1",
  "specDigest": "c86b1ab44861df88bb05c2838b320d86f6558630875f7114e92f05dc61f2cd3d",
  "tasksDigest": "ebfad29c9184084015196517b2fad0ae435300c8b602e0609df0b8ccd138a6e2",
  "evidenceDigest": "b1e4c9573ddf94e98ae9e67cdc08c123cd83c48a03b85c15012d03974e0120c2",
  "knownGaps": []
}
```
