# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The `[default]` marker and every description remain at stable columns as the configured default changes.
- Space immediately persists the highlighted global default, leaves the selector open, and shows no unsaved state.
- Changing the default leaves the active session level and checkmark unchanged, while Enter still selects the active level.
- The footer reads `Enter select  Space default  Esc close`; Ctrl+C stays open, Escape closes, and `a1 pi` retains pinned behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-thinking-selector-shortcuts",
  "sourcePr": 594,
  "archive": "openspec/changes/archive/2026-09-25-fix-thinking-selector-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-fix-thinking-selector-shortcuts/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "79ce7f3efb66abd545082943bd07ef9710d64616",
  "acceptanceScenarios": [
    "The `[default]` marker and every description remain at stable columns as the configured default changes.",
    "Space immediately persists the highlighted global default, leaves the selector open, and shows no unsaved state.",
    "Changing the default leaves the active session level and checkmark unchanged, while Enter still selects the active level.",
    "The footer reads `Enter select  Space default  Esc close`; Ctrl+C stays open, Escape closes, and `a1 pi` retains pinned behavior."
  ],
  "archiveDigest": "ed70142bd0e40e58ff30d73d9fbcdeebbb4150247c39c20cc242b3b713983066",
  "specDigest": "216ba52848c0f910016d2b554d8c70e95cdb79c6114ad600466a1f6fbe87ba38",
  "tasksDigest": "f2a5c6333af2c8b51b1035346383b49b3d7c83da88575934f48618c249a5afef",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
