# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Pointer-opened Settings value menus show the effective-value checkmark without initially highlighting an option.
- Moving the pointer onto an option highlights that option, and moving outside the menu clears the highlight.
- Keyboard navigation still begins from the effective value and direct pointer selection still applies the chosen value.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-value-menu-initial-highlight",
  "sourcePr": 697,
  "archive": "openspec/changes/archive/2026-10-06-fix-value-menu-initial-highlight/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-fix-value-menu-initial-highlight/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "cf775a8ca99953436c90e4a0e21044c4d890cf5e",
  "acceptanceScenarios": [
    "Pointer-opened Settings value menus show the effective-value checkmark without initially highlighting an option.",
    "Moving the pointer onto an option highlights that option, and moving outside the menu clears the highlight.",
    "Keyboard navigation still begins from the effective value and direct pointer selection still applies the chosen value."
  ],
  "archiveDigest": "07e3986a82bc3a51fc313aa515cc156221494c31ece9e0feb6da15a5ea1817cf",
  "specDigest": "f375f90f0bf1cbb65154104a2162984875c552055a3a8477d1e50ed5aea2327c",
  "tasksDigest": "0a9e4fa2e33d521bb1a99037b18a9962eafbc2c0f0d3537a93ac6d9fe154fe2d",
  "evidenceDigest": "d1d0fc99f0b2d6166d088d844a2315453f369696b4037e88e167b928bcb5eb52",
  "knownGaps": []
}
```
