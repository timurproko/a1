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
  "archiveDigest": "534211369a7a32db42a202147d17b40d2384f9148965abbe24e505f5a575c7dc",
  "specDigest": "44b92c850765eda7cd1cd676f4658f9272cfabeb419157516c6e7f404f27541c",
  "tasksDigest": "3e69afd1d6ce754c8c74ce3db0d1b814a17561231ea69ec95b9526e476bdf0a1",
  "evidenceDigest": "485b64827cf8c9cff4a563a9db7ef9447d803c62d6dbdbbd9cb9dafdd4343d7a",
  "knownGaps": []
}
```
