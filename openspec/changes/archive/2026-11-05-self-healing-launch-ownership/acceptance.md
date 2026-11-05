# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A new launch recovers after forced supervisor, guardian, or runtime termination without deleting persisted sessions or requiring manual control-state repair.
- Stale and reused process identities are reconciled without terminating unrelated processes or surviving sessions.
- Concurrent launches converge on one endpoint owner without rewriting another live cohort's instance records.
- Transient probe failures recover silently, while unresolved live ownership returns a concise message without a stack trace.
- Resident role loss does not prevent fresh launch admission or authorize termination of surviving holders.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "self-healing-launch-ownership",
  "sourcePr": 870,
  "archive": "openspec/changes/archive/2026-11-05-self-healing-launch-ownership/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-05-self-healing-launch-ownership/acceptance.md",
  "finalizedDate": "2026-11-05",
  "specBaseSha": "111a66b7e3174dcf876416a0b35f09960526ee93",
  "acceptanceScenarios": [
    "A new launch recovers after forced supervisor, guardian, or runtime termination without deleting persisted sessions or requiring manual control-state repair.",
    "Stale and reused process identities are reconciled without terminating unrelated processes or surviving sessions.",
    "Concurrent launches converge on one endpoint owner without rewriting another live cohort's instance records.",
    "Transient probe failures recover silently, while unresolved live ownership returns a concise message without a stack trace.",
    "Resident role loss does not prevent fresh launch admission or authorize termination of surviving holders."
  ],
  "archiveDigest": "009ce91e6277cf5385e3f98dc52ae9c3bc2810abfab1369a5ce9023100a6f36e",
  "specDigest": "a50ba5fb7bdad041d1ec48f23aae25176589b9d32d17c9c652dfab06ef842998",
  "tasksDigest": "8899a8d45a16320aeded34b75f8bef4bab4e6beb5abdc8f1f1d07e3c18a88dd2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
