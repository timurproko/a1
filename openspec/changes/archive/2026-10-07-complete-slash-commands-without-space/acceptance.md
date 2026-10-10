# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace, never blanks the menu, and narrows a broader search to only the exact matching row.
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
    "Tab-completing a top-level slash command in bare A1 leaves no trailing whitespace, never blanks the menu, and narrows a broader search to only the exact matching row.",
    "Typing `:` immediately after completing `/skills` opens the existing skills tunnel, while a user-entered space retains command-argument completion.",
    "Enter submission and non-command completion remain unchanged, and `a1 pi` retains pinned trailing-space completion."
  ],
  "archiveDigest": "060968b01f0a851ba7d2beb42e2978ee16955a0e8465180d9f1e66404e602cfa",
  "specDigest": "75413e476c8c9eb182c41bf93102de9a055957c3df12481a2e84fa6502bf2504",
  "tasksDigest": "43f5d8ab6d9b2e7e1d7e9d510e31bedff99b1ab258fa3ad160dc3a58f7dc3a8a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
