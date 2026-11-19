# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Supported live workspaces pass read-only activation inspection without taking a workspace writer lease or changing durable topology.
- Transient activation failure retries the certified exact candidate automatically without reinstalling or interrupting existing agents.
- Routine chrome omits internal activation-blocked wording and shows Update installed, restart to update only after durable restart readiness.
- Replacing the viewer preserves running agent identities, pending input, sessions, and workspace order while new agents use the selected release.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restart-update-with-live-agents",
  "sourcePr": 867,
  "archive": "openspec/changes/archive/2026-11-04-restart-update-with-live-agents/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-04-restart-update-with-live-agents/acceptance.md",
  "finalizedDate": "2026-11-04",
  "specBaseSha": "c3b7a3fd5d44c998b87847f0f79422bdbb459355",
  "acceptanceScenarios": [
    "Supported live workspaces pass read-only activation inspection without taking a workspace writer lease or changing durable topology.",
    "Transient activation failure retries the certified exact candidate automatically without reinstalling or interrupting existing agents.",
    "Routine chrome omits internal activation-blocked wording and shows Update installed, restart to update only after durable restart readiness.",
    "Replacing the viewer preserves running agent identities, pending input, sessions, and workspace order while new agents use the selected release."
  ],
  "archiveDigest": "7cdcdf106311b038f03e051c883044d7364677c39f69993e98fa1f84bb5d52a3",
  "specDigest": "d6075d978bbfc7c70dbbbc7c7ec0222843995647d426cec3b4c54c884ac64193",
  "tasksDigest": "81fbb6d430e8ddbdcde666228902aff6dc23ab727dfc25ce8078614a04a315e2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
