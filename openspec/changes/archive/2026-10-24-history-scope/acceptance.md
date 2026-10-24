# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- New solo sessions and resident Agent tabs default to separate durable prompt histories.
- Resuming the same session restores its own prompts; new or forked sessions do not inherit them.
- Shared mode restores the existing profile-wide history and its image sidecars without migrating or deleting records.
- Scope changes take effect on the next agent start without altering running agents, history limits, disabled persistence, or the Pi comparison.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "history-scope",
  "sourcePr": 826,
  "archive": "openspec/changes/archive/2026-10-24-history-scope/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-history-scope/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "249897fcdddca6cfba2e74efcb28c73b2b8d5c18",
  "acceptanceScenarios": [
    "New solo sessions and resident Agent tabs default to separate durable prompt histories.",
    "Resuming the same session restores its own prompts; new or forked sessions do not inherit them.",
    "Shared mode restores the existing profile-wide history and its image sidecars without migrating or deleting records.",
    "Scope changes take effect on the next agent start without altering running agents, history limits, disabled persistence, or the Pi comparison."
  ],
  "archiveDigest": "27c45ee01c4ee60e82a139c211c08f3e3a36de36078314092b53517758f823eb",
  "specDigest": "6cf1f00b59cf44af816980dd3e268a812dc63f90db208820e7b52c31c57818e5",
  "tasksDigest": "7189c3268b7f61a211e33f88b8b95eaafce2057f34467f6f5c5542c55c26fef0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
