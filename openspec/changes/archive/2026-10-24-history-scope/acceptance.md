# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- New agents default to Unique history, with durable entries and image sidecars isolated by conversation.
- Shared selects the existing profile-wide history and image sidecar without copying or deleting Unique entries.
- Switching History scope updates running solo agents and resident tabs; switching back reveals the selected scope's saved entries.
- Unsubmitted drafts remain intact, and submissions already in flight finish writing to their original scope.
- Disabled history remains transcript-only; history limits retain their next-start behavior and the Pi comparison remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "history-scope",
  "sourcePr": 826,
  "archive": "openspec/changes/archive/2026-10-24-history-scope/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-history-scope/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "a51b16feea8a32e61cd59c68a2ecfbe4c7f875b1",
  "acceptanceScenarios": [
    "New agents default to Unique history, with durable entries and image sidecars isolated by conversation.",
    "Shared selects the existing profile-wide history and image sidecar without copying or deleting Unique entries.",
    "Switching History scope updates running solo agents and resident tabs; switching back reveals the selected scope's saved entries.",
    "Unsubmitted drafts remain intact, and submissions already in flight finish writing to their original scope.",
    "Disabled history remains transcript-only; history limits retain their next-start behavior and the Pi comparison remains unchanged."
  ],
  "archiveDigest": "f6853cff9509f9548235835298d575db0db39c0b31457b33576591bdeb645d50",
  "specDigest": "265ce8719ad579278edc5728b3e497288eb6c43e47e3b1dc6edd002094c921a7",
  "tasksDigest": "d9aa8c5b0a99744a204094ee09e4d1e9f39ec56ee47493ccd4dcd00255774331",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
