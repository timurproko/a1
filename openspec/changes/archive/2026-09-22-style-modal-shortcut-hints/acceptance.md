# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare-A1 modal shortcut rows show dim shortcut labels and muted action names with two-space gaps and no decorative dot or bullet separators.
- Models, Skills, settings subdialogs, thinking, scoped-model, session, tree, trust, and extension-editor surfaces retain their effective bindings and action wording.
- Keyless prose, action-first grammar, unavailable bindings, and platform-specific key labels render without empty or malformed hint entries.
- Narrow modal layouts remain ANSI-safe and preserve their existing clipping or wrapping behavior.
- Startup trust uses the equivalent fixed-ANSI treatment without loading themed Pi resources, while non-modal help and footer content remain unchanged.
- Navigation, confirm/save, cancel/back, refresh, rename/delete, extension input/editor, focus restoration, and disposal behavior remain intact.
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
  "specBaseSha": "91acd99bef9292e5d0d69bc58a1860c212eda179",
  "acceptanceScenarios": [
    "Bare-A1 modal shortcut rows show dim shortcut labels and muted action names with two-space gaps and no decorative dot or bullet separators.",
    "Models, Skills, settings subdialogs, thinking, scoped-model, session, tree, trust, and extension-editor surfaces retain their effective bindings and action wording.",
    "Keyless prose, action-first grammar, unavailable bindings, and platform-specific key labels render without empty or malformed hint entries.",
    "Narrow modal layouts remain ANSI-safe and preserve their existing clipping or wrapping behavior.",
    "Startup trust uses the equivalent fixed-ANSI treatment without loading themed Pi resources, while non-modal help and footer content remain unchanged.",
    "Navigation, confirm/save, cancel/back, refresh, rename/delete, extension input/editor, focus restoration, and disposal behavior remain intact.",
    "The explicit `a1 pi` comparison profile continues to construct the public pinned components unchanged."
  ],
  "archiveDigest": "ce4be445614c85d58d3db2af57edaf3367b3b9f9ef2f7d93239be71bb3015415",
  "specDigest": "2e44812c79927ce98cc23d094a848ca49a7cae186c5ce0c930801edc55cd922f",
  "tasksDigest": "cfa50fd75f37c2dcc579a911ddd48cdfa9993ae76ee74b38b546b4c7f303d9c4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
