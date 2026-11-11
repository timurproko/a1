# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- An update from a release with this fix completes without errors even when the new release changes the control-state format, and running agents keep working.
- Once the new release is active, a later cleanup or activator failure reports success with a warning and never rolls back.
- Running `a1 update` after an update that failed after activation reports "up to date" without reinstalling.
- Older running releases read newer control state, preserve fields they do not know, and skip housekeeping instead of failing when a newer release requires a higher write level.
- Control-state writes on Windows survive a concurrent reader and leave no `release-state.json.*.tmp` files behind.
- Release validation fails if a published predecessor can no longer read, update, or maintain control state after it activates the candidate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stable-update-contract",
  "sourcePr": 913,
  "archive": "openspec/changes/archive/2026-11-11-stable-update-contract/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-stable-update-contract/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "70c8ebe762cd38cfbdc1f87fe82e674b236671c3",
  "acceptanceScenarios": [
    "An update from a release with this fix completes without errors even when the new release changes the control-state format, and running agents keep working.",
    "Once the new release is active, a later cleanup or activator failure reports success with a warning and never rolls back.",
    "Running `a1 update` after an update that failed after activation reports \"up to date\" without reinstalling.",
    "Older running releases read newer control state, preserve fields they do not know, and skip housekeeping instead of failing when a newer release requires a higher write level.",
    "Control-state writes on Windows survive a concurrent reader and leave no `release-state.json.*.tmp` files behind.",
    "Release validation fails if a published predecessor can no longer read, update, or maintain control state after it activates the candidate."
  ],
  "archiveDigest": "9682cf0db3b26eff5e42068b460e9b06641b372560b82bce8fd962a548c34b7b",
  "specDigest": "56cfa9fe0ff64aa285b58b35b54bcecd1f7b51e58575c9de2e77804c8870187a",
  "tasksDigest": "27c664d9378a27ebbfd961db329c6a846e6e3c81e7eb8cd92e694feccb51c70b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
