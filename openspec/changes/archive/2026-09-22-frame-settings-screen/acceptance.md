# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` retains the requested semantic frame, title, headings, alignment, menus, dialogs, and constrained geometry.
- Search has no trailing synthetic result gap.
- Wheel input anywhere over the search footer reaches the actual final setting.
- A section-boundary spacer cannot clamp the viewport one row before `Skills`.
- Opening and closing an untouched search restores the prior position.
- Dropdown effective-value checkmarks render cyan, including when highlighted.
- Bare A1 lists `thinking` immediately after `models` while the comparison catalog remains unchanged.

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
    "Dropdown effective-value checkmarks render cyan, including when highlighted.",
    "Bare A1 lists `thinking` immediately after `models` while the comparison catalog remains unchanged."
  ],
  "archiveDigest": "8d5ab3f47fda4b28b6b465b1d15986699509e157114849a8337a4113353d2913",
  "specDigest": "57dc4f658217e012194d20fbcf5c8c1a5e98b55ae3d1e4a80a926541442fa84f",
  "tasksDigest": "dc9db307b05139b192f0a89215664ccfec2f6e7c78adaf57c1849b04f54ec6b9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
