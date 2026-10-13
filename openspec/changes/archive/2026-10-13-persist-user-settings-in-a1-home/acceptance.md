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
  "archiveDigest": "2cbc2fe4412faf4e1e42f5e867a402bc8e8902c9b2c16002404c88008c4c9309",
  "specDigest": "979a9313227ad957d473807a0d20c239bfcff34c1ce0f105bccbc9d45537e441",
  "tasksDigest": "0ecea74c468e2919b1d3ebf10a7a9f2df7a14b6a40b6d1ffee956a8aa7719dde",
  "evidenceDigest": "2495f806efdc955be943c7b19fa07186397dd4f8076080d6f01ff8185e3a3dc5",
  "knownGaps": []
}
```
