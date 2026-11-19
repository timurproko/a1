# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- After `start()`, a custom-viewport shell forks exactly one paste helper and one copy helper on the next immediate, the first paste takes the paste spare and the replacement is forked only after it settles, and `dispose()` stops both spares.
- A paste or copy that finds an announced spare completes without a fork on its critical path; an idle spare is stopped after the idle bound, a spare that exits on its own is replaced, and direct executor callers still fork exactly one child per job.
- The paste, copy, clipboard lifecycle, packaged, session-shell, repository-governance, and contract suites pass with the startup graph pinned at 153 files and 1,442,658 bytes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "warm-spare-clipboard-helpers",
  "sourcePr": 494,
  "archive": "openspec/changes/archive/2026-09-18-warm-spare-clipboard-helpers/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-warm-spare-clipboard-helpers/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "26b7579d59aa889c7782c12e85e2835afd141205",
  "acceptanceScenarios": [
    "After `start()`, a custom-viewport shell forks exactly one paste helper and one copy helper on the next immediate, the first paste takes the paste spare and the replacement is forked only after it settles, and `dispose()` stops both spares.",
    "A paste or copy that finds an announced spare completes without a fork on its critical path; an idle spare is stopped after the idle bound, a spare that exits on its own is replaced, and direct executor callers still fork exactly one child per job.",
    "The paste, copy, clipboard lifecycle, packaged, session-shell, repository-governance, and contract suites pass with the startup graph pinned at 153 files and 1,442,658 bytes."
  ],
  "archiveDigest": "02fc6c62eeb7ea2be6f37fc8de7aeccebe8f00ff015671ec83f7fbd5366bbe93",
  "specDigest": "46dc8cdc2eac6ba163c30e9a625e772c7a9e7dff1de87a9b825408f7361ba9a5",
  "tasksDigest": "ea4c304fb896b34de2317140326d6d203ad3f94105d50f503476297efb61464d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
