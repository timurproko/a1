# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pending scalar changes display only the requested value without flashing stale effective-state text.
- Repeated `Ctrl+Z` restores successful A1 and Agent scalar changes in reverse user-action order through their owning backends.
- Undo closes an open scalar menu and preserves an active Settings search query.
- Structured-setting undo restores the preceding whole value and updates the open generic dialog.
- Failed forward saves create no undo step, while failed restorations keep their step available for retry.
- Settings uses only `Enter change`—Space is inactive—and the shared owned-dialog hint boundary rejects connective `to` actions while consistently rendering dim keys with muted actions.
- Structured dialogs show one upper boundary rule, title, muted selected-part description, menu, and hints, and consume pointer motion, clicks, releases, and wheel input without changing state.
- Per-model thinking uses the stable `Thinking Level` title, muted step context, ASCII `> ` search prompt, one-space selection cursors, searchable model and level steps, clear-override behavior, whole-object writes, back navigation, and concise active-step hints.
- Scalar value-menu choice text aligns with the source setting value while preserving the effective-value mark.
- Bare A1 omits `Fullscreen wheel scrolling`, uses global Scroll settings for the custom viewport, and labels Pi's `fullscreenCopyOnSelect` setting `Copy on select`, while comparison retains pinned behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-settings-value-undo",
  "sourcePr": 701,
  "archive": "openspec/changes/archive/2026-10-07-fix-settings-value-undo/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-fix-settings-value-undo/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "8c5bdfa26e2d0c0f8e8c33283eb86e64526cb25f",
  "acceptanceScenarios": [
    "Pending scalar changes display only the requested value without flashing stale effective-state text.",
    "Repeated `Ctrl+Z` restores successful A1 and Agent scalar changes in reverse user-action order through their owning backends.",
    "Undo closes an open scalar menu and preserves an active Settings search query.",
    "Structured-setting undo restores the preceding whole value and updates the open generic dialog.",
    "Failed forward saves create no undo step, while failed restorations keep their step available for retry.",
    "Settings uses only `Enter change`—Space is inactive—and the shared owned-dialog hint boundary rejects connective `to` actions while consistently rendering dim keys with muted actions.",
    "Structured dialogs show one upper boundary rule, title, muted selected-part description, menu, and hints, and consume pointer motion, clicks, releases, and wheel input without changing state.",
    "Per-model thinking uses the stable `Thinking Level` title, muted step context, ASCII `> ` search prompt, one-space selection cursors, searchable model and level steps, clear-override behavior, whole-object writes, back navigation, and concise active-step hints.",
    "Scalar value-menu choice text aligns with the source setting value while preserving the effective-value mark.",
    "Bare A1 omits `Fullscreen wheel scrolling`, uses global Scroll settings for the custom viewport, and labels Pi's `fullscreenCopyOnSelect` setting `Copy on select`, while comparison retains pinned behavior."
  ],
  "archiveDigest": "603ed2207dfe8cf6d87eb7cb23da1dc801c48d79dd1c0820ac1c423892a292a0",
  "specDigest": "b6ee5439467a25ae0c797ae185ceb9619cc7f4b49fded7cf40788da0bdec12cc",
  "tasksDigest": "099abbf01d4cd60b0a9eb763cb43324dccbbb29d5677eaf283608934a16191a7",
  "evidenceDigest": "4d2f815adff689fb14db70dfc4293f6962fe487b3fd572d9fb8a6060fc2dba4c",
  "knownGaps": []
}
```
