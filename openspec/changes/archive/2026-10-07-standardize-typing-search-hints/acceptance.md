# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Models, Skills, Thinking Level, Resume Session, and Session Tree display `Type search`, with `Type` in the quiet key role and `search` in the muted action role.
- Search behavior, neighboring hint order, responsive footer layout, state-specific actions, and the pinned comparison profile remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "standardize-typing-search-hints",
  "sourcePr": 702,
  "archive": "openspec/changes/archive/2026-10-07-standardize-typing-search-hints/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-standardize-typing-search-hints/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "41383a19a28531db91e7aacc1bd3b0a790e9bb08",
  "acceptanceScenarios": [
    "Models, Skills, Thinking Level, Resume Session, and Session Tree display `Type search`, with `Type` in the quiet key role and `search` in the muted action role.",
    "Search behavior, neighboring hint order, responsive footer layout, state-specific actions, and the pinned comparison profile remain unchanged."
  ],
  "archiveDigest": "6f66806dcab259854a728f257b006579e4e977176ad22bb725c91a495cccae65",
  "specDigest": "c7d4de7631b0b29642b8a5e8aa170a20c6387de18dda5ee73fd8ef59b723a137",
  "tasksDigest": "17c4808dd416167f98d24e2b0bfe2965ef4dd3b8dacfb5c5fe57528b3c8ddb62",
  "evidenceDigest": "fd66fdd37c339a9b871a4b35959065d0cbd7f647148946eb1445f2ed8157ac28",
  "knownGaps": []
}
```
