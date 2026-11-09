# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare A1 composed like the production entrypoint publishes a runtime record whose runtime ID, primary agent, session, and process identity match the running session.
- Native worktree inventory succeeds for that registered runtime instead of reporting `session-runtime-unavailable`.
- An injected process inspector replaces the production default.
- The comparison profile publishes no runtime record and acquires no claims.
- A failed first self-inspection still arms registration retries, and only the current session is republished after a switch.
- Disposal releases only the runtime's own record and claims, and a worktree held by another live runtime stays blocked.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "runtime-registration-inspector",
  "sourcePr": 893,
  "archive": "openspec/changes/archive/2026-11-09-runtime-registration-inspector/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-09-runtime-registration-inspector/acceptance.md",
  "finalizedDate": "2026-11-09",
  "specBaseSha": "747f0f74face4482a28c0a8f1df3ea088ee6df50",
  "acceptanceScenarios": [
    "Bare A1 composed like the production entrypoint publishes a runtime record whose runtime ID, primary agent, session, and process identity match the running session.",
    "Native worktree inventory succeeds for that registered runtime instead of reporting `session-runtime-unavailable`.",
    "An injected process inspector replaces the production default.",
    "The comparison profile publishes no runtime record and acquires no claims.",
    "A failed first self-inspection still arms registration retries, and only the current session is republished after a switch.",
    "Disposal releases only the runtime's own record and claims, and a worktree held by another live runtime stays blocked."
  ],
  "archiveDigest": "68b5332b944c966c1fc18afbb603a10f66b22464a5c6396d6f5d6ba706e39753",
  "specDigest": "5b81df89afa705af4f82afaecb1f0cfc552df2554cb445c088adaa76960d45b2",
  "tasksDigest": "c8c67ab234b0a6a1995e2a05b17c6b976ae3b65a3283e75cb9bc4b7b3a3f6491",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
