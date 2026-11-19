# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- An open Auto session checks its executing stable or preview channel at cache expiry within fifteen minutes and installs a newly published version without a discovery restart.
- Interrupted automatic attempts cannot claim installation or replace another owner's transaction; only an approved active release satisfying the target yields restart readiness.
- Existing sessions keep running until restarted, while Notify remains startup-only, No and opt-outs skip discovery, and explicit update commands remain available.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-automatic-updates",
  "sourcePr": 848,
  "archive": "openspec/changes/archive/2026-10-28-fix-automatic-updates/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-28-fix-automatic-updates/acceptance.md",
  "finalizedDate": "2026-10-28",
  "specBaseSha": "0ec0a4fd915c5e452ca135159dcb58e810dea96f",
  "acceptanceScenarios": [
    "An open Auto session checks its executing stable or preview channel at cache expiry within fifteen minutes and installs a newly published version without a discovery restart.",
    "Interrupted automatic attempts cannot claim installation or replace another owner's transaction; only an approved active release satisfying the target yields restart readiness.",
    "Existing sessions keep running until restarted, while Notify remains startup-only, No and opt-outs skip discovery, and explicit update commands remain available."
  ],
  "archiveDigest": "ebad606dd434d1e7cd507ba8ea7dbc51b5becfe4355ecc02536147c769b7e654",
  "specDigest": "99dd8dad992eb189660d51ba2d43e95025508be38f03c4f91c3ea434fd6db85a",
  "tasksDigest": "f5742d406359886f818214feb17148194cad13c2479e42b6c46425f16eb23266",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
