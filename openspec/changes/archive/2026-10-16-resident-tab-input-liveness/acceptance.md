# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Keystrokes and mouse events keep reaching the viewed tab while the same terminal waits for a new tab start.
- A new tab that finds no free start slot fails with a tab-start-busy notice and the terminal stays attached.
- A waiting new tab takes the next free start slot before crash recovery, within the unchanged concurrent-start limit.
- A failed tab restricts keys only while it is viewed, and other tabs accept input normally.
- The busy-close, overflow, rename, and context prompts stay visible while open and cancel when the viewed tab changes.
- A failed tab rename, close, restart, or reorder shows a notice instead of disconnecting the terminal.
- The tabs host status command shows start-slot use and lifecycle backlog and flags work stuck past ten seconds.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tab-input-liveness",
  "sourcePr": 782,
  "archive": "openspec/changes/archive/2026-10-16-resident-tab-input-liveness/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-resident-tab-input-liveness/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "e61958fc995e4e680d49b5fbd0de3a3c838f0b21",
  "acceptanceScenarios": [
    "Keystrokes and mouse events keep reaching the viewed tab while the same terminal waits for a new tab start.",
    "A new tab that finds no free start slot fails with a tab-start-busy notice and the terminal stays attached.",
    "A waiting new tab takes the next free start slot before crash recovery, within the unchanged concurrent-start limit.",
    "A failed tab restricts keys only while it is viewed, and other tabs accept input normally.",
    "The busy-close, overflow, rename, and context prompts stay visible while open and cancel when the viewed tab changes.",
    "A failed tab rename, close, restart, or reorder shows a notice instead of disconnecting the terminal.",
    "The tabs host status command shows start-slot use and lifecycle backlog and flags work stuck past ten seconds."
  ],
  "archiveDigest": "1bfd2ef5458ed53d4743eb3fc3efdd0071b4e7382175c49b66a23b4ed499abd1",
  "specDigest": "f8f9c0cb13e1f0184550c3c7d853c452b04a3635ccdc7c1d3f0cc29b630d7a91",
  "tasksDigest": "507d52abcc1f7f3a8f761271db0b6a4c158f6ed6a8e5e6d02127bb2efc8caf57",
  "evidenceDigest": "aa54212bac006050236243cfe20b7a2f06d022895fc70909d5c913f811712598",
  "knownGaps": []
}
```
