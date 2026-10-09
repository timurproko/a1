# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Enter opens an editable enumerated Settings menu without changing its value.
- A keyboard-opened menu activates the first declared choice while independently marking the effective value.
- Up and Down navigate choices, Escape closes without a write, and Enter applies the active choice through the owning backend.
- Pointer-opened menus, closed-menu Left and Right adjustment, numeric stepping, and structured dialogs retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "open-settings-value-menu-by-keyboard",
  "sourcePr": 740,
  "archive": "openspec/changes/archive/2026-10-09-open-settings-value-menu-by-keyboard/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-open-settings-value-menu-by-keyboard/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "508c44fd2af2f428e0a907eff8ba312a8db46982",
  "acceptanceScenarios": [
    "Enter opens an editable enumerated Settings menu without changing its value.",
    "A keyboard-opened menu activates the first declared choice while independently marking the effective value.",
    "Up and Down navigate choices, Escape closes without a write, and Enter applies the active choice through the owning backend.",
    "Pointer-opened menus, closed-menu Left and Right adjustment, numeric stepping, and structured dialogs retain their existing behavior."
  ],
  "archiveDigest": "789576a04858b967c640abb08e298afef51070167581fef37e5389e8869ee024",
  "specDigest": "7dd1286191ddf52bf7d38e8a02cebbab0f38a6838132726a1ca869521f25afaa",
  "tasksDigest": "047f11575df03fe0cc182ebb817cecee910a5dd2f2679f1f856334f0de2974be",
  "evidenceDigest": "e26334a910fc0650478de9886b0593c1830682fe8eee78eed6035ce54f35c1fd",
  "knownGaps": []
}
```
