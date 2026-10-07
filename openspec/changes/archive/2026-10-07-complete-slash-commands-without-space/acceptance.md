# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace and continuously retains byte-identical matching menu rows without a visible flash.
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
    "Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace and continuously retains byte-identical matching menu rows without a visible flash.",
    "Typing `:` immediately after completing `/skills` opens the existing skills tunnel, while a user-entered space retains command-argument completion.",
    "Enter submission and non-command completion remain unchanged, and `a1 pi` retains pinned trailing-space completion."
  ],
  "archiveDigest": "dde6ee3a6b66247d412d6b1616bedc77384042c857be91ba5ab8bcb8b60a00fc",
  "specDigest": "1dea8a65cd8fa0b901acf7d26f7596a12f48dbf9d7cfe2c36a20adf9fe97d1a6",
  "tasksDigest": "8de2d5158f2b5d9d47be7729880e6c4989b27dee813f2b9e6f12ddb1d805ad50",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
