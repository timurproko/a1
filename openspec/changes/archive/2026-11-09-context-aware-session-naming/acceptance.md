# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Unnamed bare A1 sessions receive prompt-derived automatic names while manual names remain unchanged.
- Worktree switches and same-path exit/re-entry regenerate automatic names from the next prompt without applying stale results.
- Session names follow footer stats and automatic changes reveal in the secondary accent while model alignment and complete terminal titles are preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "context-aware-session-naming",
  "sourcePr": 894,
  "archive": "openspec/changes/archive/2026-11-09-context-aware-session-naming/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-09-context-aware-session-naming/acceptance.md",
  "finalizedDate": "2026-11-09",
  "specBaseSha": "3af62d09bf030ab54ed112fdcd74984bd157768b",
  "acceptanceScenarios": [
    "Unnamed bare A1 sessions receive prompt-derived automatic names while manual names remain unchanged.",
    "Worktree switches and same-path exit/re-entry regenerate automatic names from the next prompt without applying stale results.",
    "Session names follow footer stats and automatic changes reveal in the secondary accent while model alignment and complete terminal titles are preserved."
  ],
  "archiveDigest": "10322fa64486cab6194eb1488ba354577ab12efa920461f5db4d398f36aa114f",
  "specDigest": "3f924a1d999c8c92c21997ca2f974d203621cb1d32bb029b62e2b1e7d60fed64",
  "tasksDigest": "f652c4b0a5e358f9db3d7779d595e745d0c86828f8d67c985a809988cb0bb748",
  "evidenceDigest": "f0ee8caa45b907573d4b33d90cf3d072546a89bf4beba81433a101743bd58ce1",
  "knownGaps": []
}
```
