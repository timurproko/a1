# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Shift+Tab cycles backward in Models, Resume Session, and Session Tree while Tab retains forward cycling.
- Reverse cycling preserves each dialog's query, selection, loading, folding, and wraparound behavior.
- Dialog hints remain forward-only, and Shift+Tab remains inert in the ordinary bare-A1 prompt.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-reverse-dialog-filter-cycling",
  "sourcePr": 692,
  "archive": "openspec/changes/archive/2026-10-06-add-reverse-dialog-filter-cycling/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-add-reverse-dialog-filter-cycling/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "bb2b7e65d9673ec1ce2d3491acf66707118d7961",
  "acceptanceScenarios": [
    "Shift+Tab cycles backward in Models, Resume Session, and Session Tree while Tab retains forward cycling.",
    "Reverse cycling preserves each dialog's query, selection, loading, folding, and wraparound behavior.",
    "Dialog hints remain forward-only, and Shift+Tab remains inert in the ordinary bare-A1 prompt."
  ],
  "archiveDigest": "2d3ae41b107bd191cfe2e99d141b239a3b5dac832f82e1a55588af2337b6874f",
  "specDigest": "7eef22dc873763c616055efbb067a2852ebd5a9697a997f643d164dfa39c370f",
  "tasksDigest": "ba6546731f9ebbcd347682efc839ceaa559ee57b4d4c3df83ca180585eb380e6",
  "evidenceDigest": "2995dda3f39cb656110de02cae5bbe07c9e9c5ded5fbf0e13573f17e41521322",
  "knownGaps": []
}
```
