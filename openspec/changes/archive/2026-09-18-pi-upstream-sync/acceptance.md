# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `node scripts/pi/propose-pi-upgrade.mjs --version 0.84.2` reports the pin current and leaves the tree unchanged; the repository-governance suite passes with the identity read from the authority.
- The rendered body for a failing candidate names the failed gates, conflicted copies, orphaned and unmapped entries, and review items, ends with the automation block, and carries no acceptance section.
- The workflow inventory records `Pi upstream sync` as a default-branch, write-authority, schedule-and-dispatch workflow with pinned actions and the `pi-upgrade-proposal` authority.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upstream-sync",
  "sourcePr": 489,
  "archive": "openspec/changes/archive/2026-09-18-pi-upstream-sync/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-pi-upstream-sync/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "6eb5f2ddf035349b7ee433ff34f7cd4abc874fc9",
  "acceptanceScenarios": [
    "`node scripts/pi/propose-pi-upgrade.mjs --version 0.84.2` reports the pin current and leaves the tree unchanged; the repository-governance suite passes with the identity read from the authority.",
    "The rendered body for a failing candidate names the failed gates, conflicted copies, orphaned and unmapped entries, and review items, ends with the automation block, and carries no acceptance section.",
    "The workflow inventory records `Pi upstream sync` as a default-branch, write-authority, schedule-and-dispatch workflow with pinned actions and the `pi-upgrade-proposal` authority."
  ],
  "archiveDigest": "c58d231ff65521120597f37505a723cf6b8ea49d57f290ef5c355435a6407d40",
  "specDigest": "aa7961b3366e0b3116dcfbc6417027fee4686e97668dcc3ee66b07b7602cfc28",
  "tasksDigest": "95947acfdfd097a8a0a4d5db63de45397d95e69cf56da5f44ef83bc3a9d76322",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
