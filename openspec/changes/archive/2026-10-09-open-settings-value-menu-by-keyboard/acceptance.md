# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Enter opens an editable enumerated Settings menu without changing its value.
- A keyboard-opened menu activates and marks the current effective choice, including when it is not the first option.
- The source row value uses the pointer-hover foreground while its keyboard-opened menu is active and returns to its ordinary role when the menu closes.
- Up and Down navigate from the current choice, Escape closes without a write, and Enter applies the active choice through the owning backend.
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
    "A keyboard-opened menu activates and marks the current effective choice, including when it is not the first option.",
    "The source row value uses the pointer-hover foreground while its keyboard-opened menu is active and returns to its ordinary role when the menu closes.",
    "Up and Down navigate from the current choice, Escape closes without a write, and Enter applies the active choice through the owning backend.",
    "Pointer-opened menus, closed-menu Left and Right adjustment, numeric stepping, and structured dialogs retain their existing behavior."
  ],
  "archiveDigest": "26f16392cb3bb96495b8cbd5f1b37b413ff26ae1522f074f3c61f6cd1bdc51ef",
  "specDigest": "0297af987df437fbab35e82a891791a6eabd2354104c1b9929b181d6b6b891b3",
  "tasksDigest": "95b1b9261506f3cda852d52d436ff0dfe1afaa868f6f5744225bb36daed0d3e9",
  "evidenceDigest": "1f08298b4494f073421c3d526fa9cac5c3dcf972dabae11c5bcc9767e5f857e5",
  "knownGaps": []
}
```
