# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` retains the requested semantic frame, title, headings, alignment, menus, dialogs, and constrained geometry.
- Search has no trailing synthetic result gap.
- Wheel input anywhere over the search footer reaches the actual final setting.
- A section-boundary spacer cannot clamp the viewport one row before `Skills`.
- Opening and closing an untouched search restores the prior position.
- Dropdown effective-value checkmarks render cyan, including when highlighted.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "frame-settings-screen",
  "sourcePr": 530,
  "archive": "openspec/changes/archive/2026-09-22-frame-settings-screen/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-frame-settings-screen/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "`/settings` retains the requested semantic frame, title, headings, alignment, menus, dialogs, and constrained geometry.",
    "Search has no trailing synthetic result gap.",
    "Wheel input anywhere over the search footer reaches the actual final setting.",
    "A section-boundary spacer cannot clamp the viewport one row before `Skills`.",
    "Opening and closing an untouched search restores the prior position.",
    "Dropdown effective-value checkmarks render cyan, including when highlighted."
  ],
  "archiveDigest": "ba43a1ab79ae3b23ef2f19a001388d596161d2eb88eef73a9b479be666a64cf8",
  "specDigest": "8df55f3dcdffcdca0b0af28ecfa93833aa23cff1d24bcfe77292c5684c9e0d6d",
  "tasksDigest": "11a196fcbf329a3d41bc2e8d6aee55a95ddfd44d76583bed45ffd042ea436554",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
