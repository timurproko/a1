# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pending scalar changes display only the requested value without flashing stale effective-state text.
- Repeated `Ctrl+Z` restores successful A1 and Agent scalar changes in reverse user-action order through their owning backends.
- Undo closes an open scalar menu and preserves an active Settings search query.
- Structured-setting undo restores the preceding whole value and updates the open dialog.
- Failed forward saves create no undo step, while failed restorations keep their step available for retry.
- Settings and structured-dialog footers advertise `Ctrl+Z to undo` from the same declarations used for dispatch.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-settings-value-undo",
  "sourcePr": 701,
  "archive": "openspec/changes/archive/2026-10-07-fix-settings-value-undo/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-fix-settings-value-undo/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "dc4726623778e968b69f898ea21a338b2446655d",
  "acceptanceScenarios": [
    "Pending scalar changes display only the requested value without flashing stale effective-state text.",
    "Repeated `Ctrl+Z` restores successful A1 and Agent scalar changes in reverse user-action order through their owning backends.",
    "Undo closes an open scalar menu and preserves an active Settings search query.",
    "Structured-setting undo restores the preceding whole value and updates the open dialog.",
    "Failed forward saves create no undo step, while failed restorations keep their step available for retry.",
    "Settings and structured-dialog footers advertise `Ctrl+Z to undo` from the same declarations used for dispatch."
  ],
  "archiveDigest": "90314ada0b27dc6ca1c55a77d6fb0df0cfda7c49642c6e81afaa5b401fb53f07",
  "specDigest": "6d085c9e6c0d6018baa6cfe24f7686ea77743b63f3f6495bf55cbe2de15eca41",
  "tasksDigest": "1fa8b82454ef09e24ded2d1513a0350fea204076c83c8ab01e611ff9579348ae",
  "evidenceDigest": "04292f8a19424cf2c6b56f8cd7d0086b77d508f66ed071cdf31c096338d7f7a4",
  "knownGaps": []
}
```
