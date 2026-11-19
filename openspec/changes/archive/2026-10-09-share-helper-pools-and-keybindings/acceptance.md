# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Two session shells sharing one clipboard services object fork exactly one spare paste helper and one spare copy helper, and those spares survive both shells' disposal until the services are disposed.
- A shell built without shared services keeps its private spares and in-process test seams fork nothing, as before.
- Building footer, header, and info presenters leaves the keybinding manager composition applied active, and `/reload` re-reads the user's keybindings into that same manager.
- In bare A1, dialog text inputs gain the owned Ctrl+Backspace/Ctrl+Delete word deletion and Ctrl+Z undo aliases; no other key behavior changes.
- Bare `a1` and `a1 pi` sessions start, paste, copy a selection, and quit as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "share-helper-pools-and-keybindings",
  "sourcePr": 733,
  "archive": "openspec/changes/archive/2026-10-09-share-helper-pools-and-keybindings/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-share-helper-pools-and-keybindings/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "7ab933e27d4f611151a182c360cc631292344485",
  "acceptanceScenarios": [
    "Two session shells sharing one clipboard services object fork exactly one spare paste helper and one spare copy helper, and those spares survive both shells' disposal until the services are disposed.",
    "A shell built without shared services keeps its private spares and in-process test seams fork nothing, as before.",
    "Building footer, header, and info presenters leaves the keybinding manager composition applied active, and `/reload` re-reads the user's keybindings into that same manager.",
    "In bare A1, dialog text inputs gain the owned Ctrl+Backspace/Ctrl+Delete word deletion and Ctrl+Z undo aliases; no other key behavior changes.",
    "Bare `a1` and `a1 pi` sessions start, paste, copy a selection, and quit as before."
  ],
  "archiveDigest": "43803ea5f125a0eeeb2577a40e83e1dd3b640290025dc9998572428302a7d41a",
  "specDigest": "5f4b573547178b516387a0c8ed7e8466be6b35f90f9b638c93492b713d0f51fc",
  "tasksDigest": "8d105b3105b3a8a3ad50232282ef892cc2a644d144ef2a8105fbb3f01869a2d5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
