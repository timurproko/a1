# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare-A1 modal and full-screen dialog shortcut rows show display-capitalized dim shortcut labels and lowercase muted action names with two-space gaps and no decorative dot or bullet separators.
- Models, Skills, Settings, Changelog, Hotkeys, thinking, scoped-model, session, tree, trust, and extension input/editor surfaces retain their effective bindings and action wording.
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
  "specBaseSha": "8653fa4ffbe95d00c236065ee5efbdb4ddf4babf",
  "acceptanceScenarios": [
    "Bare-A1 modal and full-screen dialog shortcut rows show display-capitalized dim shortcut labels and lowercase muted action names with two-space gaps and no decorative dot or bullet separators.",
    "Models, Skills, Settings, Changelog, Hotkeys, thinking, scoped-model, session, tree, trust, and extension input/editor surfaces retain their effective bindings and action wording.",
    "Keyless prose, action-first grammar, unavailable bindings, and platform-specific key labels render without empty or malformed hint entries.",
    "Narrow dialog layouts remain ANSI-safe and preserve their existing clipping or wrapping behavior.",
    "Startup trust uses the equivalent fixed-ANSI treatment without loading themed Pi resources, while ordinary shell help, status, transcript, and footer content remain unchanged.",
    "Navigation, scrolling, search, confirm/save, cancel/back, refresh, rename/delete, extension input/editor, focus restoration, and disposal behavior remain intact.",
    "The explicit `a1 pi` comparison profile continues to construct the public pinned components unchanged."
  ],
  "archiveDigest": "660d2d08fef520a63a794aa4ffd8afbf3bde3d0c18e90e904b2fa8edf60c141b",
  "specDigest": "78dbc2051398f871f5f62a36ecee94cc45e61b422c8fdd59b5b66df0d0cdd451",
  "tasksDigest": "d0a9c47af5bb9007af9da222e2c5b83e091cb63b05284b8f74616403990f47ba",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
