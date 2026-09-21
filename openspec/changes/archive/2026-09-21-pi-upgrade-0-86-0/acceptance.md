# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Open the settings list, set Cache warming to idle and then back to off, and confirm each choice is accepted and persists instead of being rejected.
- With at least one skill installed, type /skill: in the editor and confirm the per-skill rows appear, and that no bug command is offered anywhere in the menu.
- Run /tree and /resume and confirm both selectors still open and behave normally now that they load on demand.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-86-0",
  "sourcePr": 522,
  "archive": "openspec/changes/archive/2026-09-21-pi-upgrade-0-86-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-pi-upgrade-0-86-0/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "95216f1e15b726fdfb03fb3c4d3d252091c021f0",
  "acceptanceScenarios": [
    "Open the settings list, set Cache warming to idle and then back to off, and confirm each choice is accepted and persists instead of being rejected.",
    "With at least one skill installed, type /skill: in the editor and confirm the per-skill rows appear, and that no bug command is offered anywhere in the menu.",
    "Run /tree and /resume and confirm both selectors still open and behave normally now that they load on demand."
  ],
  "archiveDigest": "d115432cfecf525fbd8008dddaa53215e1364e69365050a62c7f2f924bb92ad0",
  "specDigest": "872ab80404af993716823e0625c4feb6449bc83d9bc08a8e1816f18eee5125cc",
  "tasksDigest": "3429d1b5989d3ff4833e224ec15655bcf3f58ab9c62d74dd25dd490dfb8db193",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
