# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- On macOS with a stock terminal configuration, Option+1 through Option+0 view tabs one through ten instead of typing symbols into the agent prompt.
- Option+A creates an Agent tab, Option+W closes the tab, Option+Comma opens Settings, and Option+Slash opens Commands, with no character reaching the agent.
- Option characters whose Alt chord is not bound to a tab action, such as Option+P, still type their character.
- On keyboard layouts other than ABC and U.S., such as Swedish or UK, keys like å and £ type normally and never trigger tab actions.
- After a tab action is rebound, its old Option character types again, and Windows, Linux, and terminals already sending Option as Alt behave as before.
- On macOS the tab menu shows Close Option+W, and the Commands palette, plus menu, Keyboard Shortcuts, and modal hints all name Alt Option, while Windows and Linux keep Alt.
- A failed tab's banner names the effective close shortcut and omits it when close is unbound.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "map-macos-option-shortcuts",
  "sourcePr": 857,
  "archive": "openspec/changes/archive/2026-10-31-map-macos-option-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-31-map-macos-option-shortcuts/acceptance.md",
  "finalizedDate": "2026-10-31",
  "specBaseSha": "a2e98c45364dec69b07a1ae71d3ea20a85feb6f9",
  "acceptanceScenarios": [
    "On macOS with a stock terminal configuration, Option+1 through Option+0 view tabs one through ten instead of typing symbols into the agent prompt.",
    "Option+A creates an Agent tab, Option+W closes the tab, Option+Comma opens Settings, and Option+Slash opens Commands, with no character reaching the agent.",
    "Option characters whose Alt chord is not bound to a tab action, such as Option+P, still type their character.",
    "On keyboard layouts other than ABC and U.S., such as Swedish or UK, keys like å and £ type normally and never trigger tab actions.",
    "After a tab action is rebound, its old Option character types again, and Windows, Linux, and terminals already sending Option as Alt behave as before.",
    "On macOS the tab menu shows Close Option+W, and the Commands palette, plus menu, Keyboard Shortcuts, and modal hints all name Alt Option, while Windows and Linux keep Alt.",
    "A failed tab's banner names the effective close shortcut and omits it when close is unbound."
  ],
  "archiveDigest": "aae652caa7c15545649b80455764e7cbca6f9d2444c474de5259aa7376f5d204",
  "specDigest": "a87f1e33be292e2ee3d4bcaad51df978c740430d3b11479c307b230d0be38f49",
  "tasksDigest": "47fe22659ff62f1daafa142e9505a8a42e162081b7908222f4fa4b23d4bc9bab",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
