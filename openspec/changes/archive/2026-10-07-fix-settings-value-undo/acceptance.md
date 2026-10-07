# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pending scalar changes display only the requested value without flashing stale effective-state text.
- Repeated `Ctrl+Z` restores successful A1 and Agent scalar changes in reverse user-action order through their owning backends.
- Undo closes an open scalar menu and preserves an active Settings search query.
- Structured-setting undo restores the preceding whole value and updates the open generic dialog.
- Failed forward saves create no undo step, while failed restorations keep their step available for retry.
- The shared owned-dialog hint boundary rejects connective `to` actions and consistently renders dim keys with muted actions, including `Ctrl+Z undo` and `Esc close`.
- Structured dialogs show one upper boundary rule, title, muted selected-part description, menu, and hints, and consume pointer motion, clicks, releases, and wheel input without changing state.
- Per-model thinking uses the stable `Thinking Level` title, muted inline step marker and next-line instruction, searchable model step, supported-level step, clear-override behavior, whole-object writes, back navigation, and concise active-step hints.
- Bare A1 omits `Fullscreen wheel scrolling` and uses its global owned Scroll settings as the custom viewport's wheel authority.
- Bare A1 labels Pi's `fullscreenCopyOnSelect` setting `Copy on select`, while the comparison profile retains pinned wording and behavior.

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
    "The shared owned-dialog hint boundary rejects connective `to` actions and consistently renders dim keys with muted actions, including `Ctrl+Z undo` and `Esc close`.",
    "Structured dialogs show one upper boundary rule, title, muted selected-part description, menu, and hints, and consume pointer motion, clicks, releases, and wheel input without changing state.",
    "Per-model thinking uses the stable `Thinking Level` title, muted inline step marker and next-line instruction, searchable model step, supported-level step, clear-override behavior, whole-object writes, back navigation, and concise active-step hints.",
    "Bare A1 omits `Fullscreen wheel scrolling` and uses its global owned Scroll settings as the custom viewport's wheel authority.",
    "Bare A1 labels Pi's `fullscreenCopyOnSelect` setting `Copy on select`, while the comparison profile retains pinned wording and behavior."
  ],
  "archiveDigest": "5059d7eaab6cffaffed1b3e36c5e428514864434fed7e78f244e834952ac59af",
  "specDigest": "d038f0f1a643fe0ba831eb5c65677a5ca110e6675f60061a0a6aea99ef5d96ee",
  "tasksDigest": "034480f253d5c558eb59d303c770e103d66cfb58fc5331b444f9be75bbacea93",
  "evidenceDigest": "cb424856164e940b5411033118b21bd0a482fbb06816b815a2f4bcc8690e64b4",
  "knownGaps": []
}
```
