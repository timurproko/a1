# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A confirmed non-default npm prefix updates the invoked A1 installation in place instead of creating an installation under npm's active default prefix.
- Checkouts, links, malformed package layouts, and missing, linked, or wrong-target launcher sets are refused before installation mutation.
- Protected replacement pins the selected prefix while resolving the npm implementation independently from the active npm root.
- Cancellation and updater loss restore launchers only under the selected prefix, while valid legacy recovery capsules remain readable.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "update-owned-npm-prefix",
  "sourcePr": 544,
  "archive": "openspec/changes/archive/2026-09-22-update-owned-npm-prefix/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-update-owned-npm-prefix/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "d24718c100d0839f0fca96a00301da17e468c012",
  "acceptanceScenarios": [
    "A confirmed non-default npm prefix updates the invoked A1 installation in place instead of creating an installation under npm's active default prefix.",
    "Checkouts, links, malformed package layouts, and missing, linked, or wrong-target launcher sets are refused before installation mutation.",
    "Protected replacement pins the selected prefix while resolving the npm implementation independently from the active npm root.",
    "Cancellation and updater loss restore launchers only under the selected prefix, while valid legacy recovery capsules remain readable."
  ],
  "archiveDigest": "71719f69b71694c8cb19a72ca99f82aa5e70fe2b3a82372a0ba76f0a82c81658",
  "specDigest": "e059edcc1ff4a1cb0cb1d8ebf0c318430e05de5f94abc92175b655a20b3c3823",
  "tasksDigest": "bbed7bbf6ae3aca40b56f37352499bce34d584a75945389619254d0022f94f70",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
