# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A named resident tab shows its session name in the tab chip, and its inner footer shows the repository path, branch, and linked pull-request number without repeating the name.
- `a1 solo` and a resident fallback session still end the footer path row with the session name.
- Renaming a resident tab still updates its tab chip.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hide-resident-footer-session-name",
  "sourcePr": 779,
  "archive": "openspec/changes/archive/2026-10-15-hide-resident-footer-session-name/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-hide-resident-footer-session-name/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "4e3b085346ba38cafb86fec39f0c62b31498ac0a",
  "acceptanceScenarios": [
    "A named resident tab shows its session name in the tab chip, and its inner footer shows the repository path, branch, and linked pull-request number without repeating the name.",
    "`a1 solo` and a resident fallback session still end the footer path row with the session name.",
    "Renaming a resident tab still updates its tab chip."
  ],
  "archiveDigest": "2c1acd8eb62bd9d3a47684affda05bb00b4163bc8e1e3a5abedb198428a3c9f8",
  "specDigest": "9ca44c74a1c430a63d45e45f3a0e55b822d7d481a9059f34a25b4f1918f5e85a",
  "tasksDigest": "0ddd4b791f782a7aa191d935d622e2f85f5327958c38b0aef470e7dd40bc89b7",
  "evidenceDigest": "239ea8f171f7f2242cdc2fc0c848a42a051da669ad0517fb7c98109487604445",
  "knownGaps": []
}
```
