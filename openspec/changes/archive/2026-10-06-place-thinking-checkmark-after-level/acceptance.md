# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The configured default thinking level shows one accent-colored `◉`, every other level shows a dim `○`, and neither the Models multi-select `●` nor `[default]` appears.
- The active thinking level keeps its success-green checkmark one space after the level name while descriptions remain column-aligned.
- Pressing Space moves and persists the single selected radio without changing the active session level or closing the selector.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-thinking-checkmark-after-level",
  "sourcePr": 685,
  "archive": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "7c31047556e44ce7c6c83a2750d52b00ce18bdc5",
  "acceptanceScenarios": [
    "The configured default thinking level shows one accent-colored `◉`, every other level shows a dim `○`, and neither the Models multi-select `●` nor `[default]` appears.",
    "The active thinking level keeps its success-green checkmark one space after the level name while descriptions remain column-aligned.",
    "Pressing Space moves and persists the single selected radio without changing the active session level or closing the selector."
  ],
  "archiveDigest": "45b47b110f13cf20ad56991d661911099664b8930e5adc03066fec25dd246aaf",
  "specDigest": "27ba845cab473973c91a067bbf74a2076d1746e74ab7df26da95bd0e214cbc77",
  "tasksDigest": "fc49894bbf0e47229fdf09b87fdc97d657d34a8c4629ee68d25910fa90ff6942",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
