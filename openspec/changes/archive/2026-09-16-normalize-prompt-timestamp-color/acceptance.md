# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Submitted-prompt timestamps remain metadata-grey at normal intensity across normal, pinned, hovered, quiet/dimmed, and text-selected states.
- Prompt-body dimming, hover and selection backgrounds, timestamp geometry, and completed-compaction parity remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "normalize-prompt-timestamp-color",
  "sourcePr": 431,
  "archive": "openspec/changes/archive/2026-09-16-normalize-prompt-timestamp-color/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-normalize-prompt-timestamp-color/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "94075aef090d324b3b596e175516d677483cca10",
  "acceptanceScenarios": [
    "Submitted-prompt timestamps remain metadata-grey at normal intensity across normal, pinned, hovered, quiet/dimmed, and text-selected states.",
    "Prompt-body dimming, hover and selection backgrounds, timestamp geometry, and completed-compaction parity remain unchanged."
  ],
  "archiveDigest": "d6ac011bf4e4ddcca3bf8afb5d385010442e46752e8bab5b6f7032f4efd3a002",
  "specDigest": "62f847585c83d8ffe27084debd0f541e7528dfc2aa2f35941474b93b4aa3a2c2",
  "tasksDigest": "4d81ae9bf077820635ca7d26fb8415251cf4f8179122799290fa434b8e9c1b99",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
