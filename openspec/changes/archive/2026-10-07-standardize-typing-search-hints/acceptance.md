# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Models and Session Tree display `Type search`, with `Type` in the quiet key role and `search` in the muted action role.
- Search behavior, neighboring hint order, responsive footer layout, and the pinned comparison profile remain unchanged.

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
    "Models and Session Tree display `Type search`, with `Type` in the quiet key role and `search` in the muted action role.",
    "Search behavior, neighboring hint order, responsive footer layout, and the pinned comparison profile remain unchanged."
  ],
  "archiveDigest": "2e1a05cbc923fa18fd7258f4206de6dfb41e783313ee140813d15361ba97df6f",
  "specDigest": "85b706cdd6192ae9c4e281c8597733ec25633ece828b656c07ac11aeb9ce13fc",
  "tasksDigest": "ff5715aca5e0d59833f7d80c42c4e9597d6db69ec518055ea196d78178dbf345",
  "evidenceDigest": "a99ef0dfdee1858655ad2b340dc48ddf3152b9e262c76da8c397208be20399dd",
  "knownGaps": []
}
```
