# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace and immediately shows its selected matching command row.
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
    "Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace and immediately shows its selected matching command row.",
    "Typing `:` immediately after completing `/skills` opens the existing skills tunnel, while a user-entered space retains command-argument completion.",
    "Enter submission and non-command completion remain unchanged, and `a1 pi` retains pinned trailing-space completion."
  ],
  "archiveDigest": "72908c218b52b34bb6bb7457b8d6611f0bb39d3f5e6288e8f3a9ea8325531e28",
  "specDigest": "97327627c0b7cb11136c864ab8e097dcd70e7a2c46e51e49bd96e604b2568f34",
  "tasksDigest": "7d23438f7c18b7fdeb87d6718922c4df85fb7b86a6e029ef9146ba7e21ac6ee7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
