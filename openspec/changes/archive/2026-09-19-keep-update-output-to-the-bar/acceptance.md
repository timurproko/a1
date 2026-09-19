# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Updating with an installed updater older than 0.1.8-dev.479 completes without a Node stack trace or a proxy diagnostic: the newly installed tree's `bin/sync-pi-tui-proxy.js` exits 0 silently.
- An update whose npm children succeed while writing notices or warnings to stderr shows only the progress bar and the success line.
- A failed registry lookup or installation prints the child's own bounded text once, immediately before the line naming the failed action, and omits the review hint when the child wrote nothing.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-update-output-to-the-bar",
  "sourcePr": 511,
  "archive": "openspec/changes/archive/2026-09-19-keep-update-output-to-the-bar/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-keep-update-output-to-the-bar/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "d0ecb9524301b3cde0870813d21593f8428d45e1",
  "acceptanceScenarios": [
    "Updating with an installed updater older than 0.1.8-dev.479 completes without a Node stack trace or a proxy diagnostic: the newly installed tree's `bin/sync-pi-tui-proxy.js` exits 0 silently.",
    "An update whose npm children succeed while writing notices or warnings to stderr shows only the progress bar and the success line.",
    "A failed registry lookup or installation prints the child's own bounded text once, immediately before the line naming the failed action, and omits the review hint when the child wrote nothing."
  ],
  "archiveDigest": "1420c556fa244b1010a4a59ab6b35363a8a5dc47d0a1f1074ea29ba236d92943",
  "specDigest": "7980081ad8e02cca504d69f2695c91a8c96ecfb0b88c737562921a6ad32366e3",
  "tasksDigest": "ec042340eb9effc0115fcd63b959582fcdac7d022d903d1149fc3c18d410b5d7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
