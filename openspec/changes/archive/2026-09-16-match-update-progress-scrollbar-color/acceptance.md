# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Completed self-update progress renders in `#8abeb7` while the remaining track and percentage retain their muted colors.
- Partial, zero, and complete progress preserve the existing 40-column geometry, percentage calculation, and terminal color reset.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "match-update-progress-scrollbar-color",
  "sourcePr": 433,
  "archive": "openspec/changes/archive/2026-09-16-match-update-progress-scrollbar-color/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-match-update-progress-scrollbar-color/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "94075aef090d324b3b596e175516d677483cca10",
  "acceptanceScenarios": [
    "Completed self-update progress renders in `#8abeb7` while the remaining track and percentage retain their muted colors.",
    "Partial, zero, and complete progress preserve the existing 40-column geometry, percentage calculation, and terminal color reset."
  ],
  "archiveDigest": "91f94e5a3857483a8e2378c1013b00ed07dfedfcbd5001f430e359a794271173",
  "specDigest": "caf01b8e2ad28d717ec5c35c4b5b34fdfaa57f88d921eeb2882075520e1c14c1",
  "tasksDigest": "302a1015b76b718ad49f863d4ae34a628e25351c4c8b668627987b4dc540b641",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
