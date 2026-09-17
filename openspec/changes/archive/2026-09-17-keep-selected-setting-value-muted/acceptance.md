# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The selected settings row paints only its cursor and label in the accent; its value stays grey and brightens to the terminal foreground under the pointer, like every other value.
- Pinned-row parity holds for unselected rows and for the selected row up to its label, and the muted selected value is asserted explicitly so it cannot drift back to the accent.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-selected-setting-value-muted",
  "sourcePr": 463,
  "archive": "openspec/changes/archive/2026-09-17-keep-selected-setting-value-muted/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-keep-selected-setting-value-muted/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "9448204a4c593148e415a9feef659293423948a6",
  "acceptanceScenarios": [
    "The selected settings row paints only its cursor and label in the accent; its value stays grey and brightens to the terminal foreground under the pointer, like every other value.",
    "Pinned-row parity holds for unselected rows and for the selected row up to its label, and the muted selected value is asserted explicitly so it cannot drift back to the accent."
  ],
  "archiveDigest": "1ba912d6fd4811931fa257bccf0d5d79817da98d019b135708f18319cee59504",
  "specDigest": "239dc140eaf28e08fae2715a853f3f353d782866cf970d7fb05b851073a8410a",
  "tasksDigest": "29716fb4951bffb8e82ec45d26ba85850d77638d78b5777df78ab76b4e41fc70",
  "evidenceDigest": "63f5e44991e818f4814ac12cbbf3f920cda467bade77420770c15d53dd60306f",
  "knownGaps": []
}
```
