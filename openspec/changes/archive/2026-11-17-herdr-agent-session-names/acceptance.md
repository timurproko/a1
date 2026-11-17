# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The A1 plugin preserves existing preferences and offers independent space-color and sidebar-rename switches.
- Rename edits the selected Agents row with existing text selected, compact save/cancel controls and no modal; Enter saves and Escape or blur cancels.
- Sidebar renames update only the captured live A1 session; changed identities, expired requests and conflicting name revisions refuse the write.
- Local and remote name operations use the shared exact-target API and acknowledge only authoritative applied names.
- Vanilla A1-to-Herdr name updates remain unchanged even when the plugin or sidebar renaming is disabled.
- Applied manual names persist through the existing naming owner and are protected from automatic renaming.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "herdr-agent-session-names",
  "sourcePr": 968,
  "archive": "openspec/changes/archive/2026-11-17-herdr-agent-session-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-herdr-agent-session-names/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "a8fcf44b5ff573798c386236229de3347c942793",
  "acceptanceScenarios": [
    "The A1 plugin preserves existing preferences and offers independent space-color and sidebar-rename switches.",
    "Rename edits the selected Agents row with existing text selected, compact save/cancel controls and no modal; Enter saves and Escape or blur cancels.",
    "Sidebar renames update only the captured live A1 session; changed identities, expired requests and conflicting name revisions refuse the write.",
    "Local and remote name operations use the shared exact-target API and acknowledge only authoritative applied names.",
    "Vanilla A1-to-Herdr name updates remain unchanged even when the plugin or sidebar renaming is disabled.",
    "Applied manual names persist through the existing naming owner and are protected from automatic renaming."
  ],
  "archiveDigest": "b02000038e7243765434867cda8026f1570f88ce2ecc650b7b1d1ef6636fdd35",
  "specDigest": "98ac5f24a8d620caa0fc7ed08b4332e82186ebe15c7b15d340c2fa1c3ca2908c",
  "tasksDigest": "ed74f53a31b1109c7bb9e4bcb14e9888c693ccc083ddbeb96d540b67ddc4496e",
  "evidenceDigest": "a44b9f745eca8b2f759171a32ec0355a1432da3977cf3da11fcdb0258d7203e0",
  "knownGaps": []
}
```
