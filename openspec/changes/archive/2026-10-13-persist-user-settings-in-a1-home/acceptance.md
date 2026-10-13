# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Non-default A1 choices are direct properties under `a1` in the normal agent `settings.json`, while restored defaults are absent.
- Pi root and package settings preserve the product object during sequential and overlapping process writes.
- A valid settings object with stray leading text is normalized automatically; ambiguous corruption, non-object namespaces, and Pi root-key collisions still fail closed.
- Settings always keeps its shortcut hints in the status row instead of replacing them with notices.
- Former standalone choices import without modifying the old file, and remaining choices survive restart and replacement releases.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "persist-user-settings-in-a1-home",
  "sourcePr": 767,
  "archive": "openspec/changes/archive/2026-10-13-persist-user-settings-in-a1-home/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-13-persist-user-settings-in-a1-home/acceptance.md",
  "finalizedDate": "2026-10-13",
  "specBaseSha": "9982758e573e239458c6880f6ff9928a984e23aa",
  "acceptanceScenarios": [
    "Non-default A1 choices are direct properties under `a1` in the normal agent `settings.json`, while restored defaults are absent.",
    "Pi root and package settings preserve the product object during sequential and overlapping process writes.",
    "A valid settings object with stray leading text is normalized automatically; ambiguous corruption, non-object namespaces, and Pi root-key collisions still fail closed.",
    "Settings always keeps its shortcut hints in the status row instead of replacing them with notices.",
    "Former standalone choices import without modifying the old file, and remaining choices survive restart and replacement releases."
  ],
  "archiveDigest": "05ecfda7566a9540551870bffcff33eeab3c929ad6177ef48a1289059b48ba0d",
  "specDigest": "979a9313227ad957d473807a0d20c239bfcff34c1ce0f105bccbc9d45537e441",
  "tasksDigest": "525544a9153595c7a35917c3fd48d2b60a9617c3a37c6c23b9fc44ed320aa2f4",
  "evidenceDigest": "c472add96934a7858bc9c81da31fe6290bdde9b43211959423857109748e4002",
  "knownGaps": []
}
```
