# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Tab-completing a top-level slash command in bare A1 leaves the exact slash command with no trailing whitespace.
- Typing `:` immediately after completing `/skills` opens the existing skills tunnel, while a user-entered space retains command-argument completion.
- Enter submission and non-command completion remain unchanged, and `a1 pi` retains pinned trailing-space completion.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "complete-slash-commands-without-space",
  "sourcePr": 700,
  "archive": "openspec/changes/archive/2026-10-07-complete-slash-commands-without-space/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-complete-slash-commands-without-space/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "21d13876f14c5ad2630f51073299a71af36ce753",
  "acceptanceScenarios": [
    "Tab-completing a top-level slash command in bare A1 leaves the exact slash command with no trailing whitespace.",
    "Typing `:` immediately after completing `/skills` opens the existing skills tunnel, while a user-entered space retains command-argument completion.",
    "Enter submission and non-command completion remain unchanged, and `a1 pi` retains pinned trailing-space completion."
  ],
  "archiveDigest": "89b5860c7ae7389636506d5dbd28347513156780059fc2923b2366102d69d232",
  "specDigest": "8219c8ed28ce12e8045522205acff5419e5f9e8cece10530628adcb7d0ac8afe",
  "tasksDigest": "8a97cf090e940552207116b967b452efb76b2d3d4ed5e6a1fca2c7b18f56eec4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
