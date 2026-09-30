# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Complete and startup changelog links retain their labels, colors, and exact OSC 8 targets without a renderer-owned solid underline.
- Terminal-native dotted idle and solid hover decoration matches agent-content links while hotkeys and `a1 pi` remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "match-changelog-native-link-decoration",
  "sourcePr": 649,
  "archive": "openspec/changes/archive/2026-09-30-match-changelog-native-link-decoration/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-match-changelog-native-link-decoration/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "622e2153997061a3248f94784893ea1a6758c286",
  "acceptanceScenarios": [
    "Complete and startup changelog links retain their labels, colors, and exact OSC 8 targets without a renderer-owned solid underline.",
    "Terminal-native dotted idle and solid hover decoration matches agent-content links while hotkeys and `a1 pi` remain unchanged."
  ],
  "archiveDigest": "1821e65d0469243e37bdcee775bb909d12ee62731b5470645af859662e493833",
  "specDigest": "d0c496ea3312690d33ff441125045e9cda2eeae2dcf6a0fdf49d09fe5d22c2a6",
  "tasksDigest": "1d18efe746537d2373e1592ea6e30180614d7f478137ca77569e2826ba579712",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
