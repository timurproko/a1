# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The active thinking level renders its success-green checkmark one space after the level name, including both short and widest names.
- Default markers and descriptions remain column-aligned across active/default combinations without changing selection or persistence behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-thinking-checkmark-after-level",
  "sourcePr": 685,
  "archive": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "d9ac865473ea2164df226738b42ac3c7a73014e5",
  "acceptanceScenarios": [
    "The active thinking level renders its success-green checkmark one space after the level name, including both short and widest names.",
    "Default markers and descriptions remain column-aligned across active/default combinations without changing selection or persistence behavior."
  ],
  "archiveDigest": "5e11539cae8f393fcdbf8229db5d7290095df80682977ea1fd9a27360601703d",
  "specDigest": "511c86a94d2814c89784e25fa6cb138a9a56dcab70ffc83d731ee44ce2241576",
  "tasksDigest": "4856b7b97590db30d0a9c19ae9388abe0b8047946a1ad93738d46fa75443378e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
