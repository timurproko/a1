# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare-A1 modal and full-screen dialog shortcut rows show dim shortcut labels and muted action names with two-space gaps and no decorative dot or bullet separators.
- Models, Skills, Settings, Changelog, Hotkeys, thinking, scoped-model, session, tree, trust, and extension-editor surfaces retain their effective bindings and action wording.
- Keyless prose, action-first grammar, unavailable bindings, and platform-specific key labels render without empty or malformed hint entries.
- Narrow dialog layouts remain ANSI-safe and preserve their existing clipping or wrapping behavior.
- Startup trust uses the equivalent fixed-ANSI treatment without loading themed Pi resources, while ordinary shell help, status, transcript, and footer content remain unchanged.
- Navigation, scrolling, search, confirm/save, cancel/back, refresh, rename/delete, extension input/editor, focus restoration, and disposal behavior remain intact.
- The explicit `a1 pi` comparison profile continues to construct the public pinned components unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "style-modal-shortcut-hints",
  "sourcePr": 546,
  "archive": "openspec/changes/archive/2026-09-22-style-modal-shortcut-hints/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-style-modal-shortcut-hints/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "39b8df5eca7a09070803cdb7a12791c47bf44a97",
  "acceptanceScenarios": [
    "Bare-A1 modal and full-screen dialog shortcut rows show dim shortcut labels and muted action names with two-space gaps and no decorative dot or bullet separators.",
    "Models, Skills, Settings, Changelog, Hotkeys, thinking, scoped-model, session, tree, trust, and extension-editor surfaces retain their effective bindings and action wording.",
    "Keyless prose, action-first grammar, unavailable bindings, and platform-specific key labels render without empty or malformed hint entries.",
    "Narrow dialog layouts remain ANSI-safe and preserve their existing clipping or wrapping behavior.",
    "Startup trust uses the equivalent fixed-ANSI treatment without loading themed Pi resources, while ordinary shell help, status, transcript, and footer content remain unchanged.",
    "Navigation, scrolling, search, confirm/save, cancel/back, refresh, rename/delete, extension input/editor, focus restoration, and disposal behavior remain intact.",
    "The explicit `a1 pi` comparison profile continues to construct the public pinned components unchanged."
  ],
  "archiveDigest": "53d5a14818830aa2ff8c7074ea0fc9c700ccfb2409059d9ea3d7f5c343ec7379",
  "specDigest": "024db9e3c05b65a09b57a6755f8b5d6b5c2e07bcdced5a992524a0b09d3fe9a4",
  "tasksDigest": "0cb486d4303905e210eef9e4c68fde1d55d4d63052e068e079a09e1013fd912f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
