# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- An external coding agent can create and verify an isolated delivery worktree using ordinary Git without an A1 installation, runtime, or session link.
- An agent resumes the same delivery only with verified context and continuing ownership or explicit handoff, claiming a released cleanup registration before edits and refusing conflicting owners.
- A1 runtime linking and Claude worktree hooks apply within their respective environments, while missing A1 integration alone does not block external agents.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "agent-neutral-delivery",
  "sourcePr": 874,
  "archive": "openspec/changes/archive/2026-11-06-agent-neutral-delivery/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-06-agent-neutral-delivery/acceptance.md",
  "finalizedDate": "2026-11-06",
  "specBaseSha": "7f9f16dd125e0b71f9f1731878605a0adb822a5c",
  "acceptanceScenarios": [
    "An external coding agent can create and verify an isolated delivery worktree using ordinary Git without an A1 installation, runtime, or session link.",
    "An agent resumes the same delivery only with verified context and continuing ownership or explicit handoff, claiming a released cleanup registration before edits and refusing conflicting owners.",
    "A1 runtime linking and Claude worktree hooks apply within their respective environments, while missing A1 integration alone does not block external agents."
  ],
  "archiveDigest": "a17bd9a7b5d1a471972640a6e0e1901a8b75a1d3a4c95d6d7d54239d67c047cb",
  "specDigest": "526b96f091694ca11dbf8adfac5364b7266dd88dc76b40e21ea8365219271b57",
  "tasksDigest": "f19aabfd7918ced5fb2826cc95f2df2d8d085223442d7ed2e33c0fe6c0a834f3",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
