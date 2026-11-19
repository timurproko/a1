# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An authorized maintainer can personally arm native auto-merge for the finalized head, and protected integration after exact-head validation is attributed to that human decision.
- A changed candidate, stale arm, bot/App actor, documentation automation, or merge queue cannot supply implementation acceptance authority.
- A human enable followed by disable and valid manual merge re-verifies PR #709-shaped history without rewriting the PR, archive, manifest, or `develop`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "allow-human-enabled-auto-merge",
  "sourcePr": 711,
  "archive": "openspec/changes/archive/2026-10-07-allow-human-enabled-auto-merge/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-allow-human-enabled-auto-merge/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "230ee61f68495133e5e6dc4ecf7033002164b0e4",
  "acceptanceScenarios": [
    "An authorized maintainer can personally arm native auto-merge for the finalized head, and protected integration after exact-head validation is attributed to that human decision.",
    "A changed candidate, stale arm, bot/App actor, documentation automation, or merge queue cannot supply implementation acceptance authority.",
    "A human enable followed by disable and valid manual merge re-verifies PR #709-shaped history without rewriting the PR, archive, manifest, or `develop`."
  ],
  "archiveDigest": "f160fa24161579d4fdd23700dd6c0a3b20888a4b38ce6e201d99e01929735479",
  "specDigest": "46ed9ac9c5c870c3771c66f1d5adac77c327c023f81e529786071c0e115388ed",
  "tasksDigest": "82520c40a3a819b496f3b83b605470a772a64b9239b467ec906bffa426fdb977",
  "evidenceDigest": "9b7726ae864076c680829aad84a9e017481a4dcf93c4a364e168d2bfa281a76c",
  "knownGaps": []
}
```
