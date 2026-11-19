# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run release -- patch` starts a candidate validation run that passes the publisher's source selection.
- The command prints the validation run link on its own line and waits for the run.
- The draft edit link appears on its own line only after validation succeeds.
- A failed validation reports its failed jobs and withholds the edit link.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "wait-for-release-validation",
  "sourcePr": 631,
  "archive": "openspec/changes/archive/2026-09-29-wait-for-release-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-wait-for-release-validation/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "7e814a17448633f806ce804ab5460a21d259ced6",
  "acceptanceScenarios": [
    "`npm run release -- patch` starts a candidate validation run that passes the publisher's source selection.",
    "The command prints the validation run link on its own line and waits for the run.",
    "The draft edit link appears on its own line only after validation succeeds.",
    "A failed validation reports its failed jobs and withholds the edit link."
  ],
  "archiveDigest": "5abec8a2b2e9434957af90ae5d6674e6cdbcb7a28452be3c50335f372316b5ce",
  "specDigest": "411b935b2ef5a1f7e888ad253a9fb17c56eb543e4d99a965cc27c8d183f8d8d5",
  "tasksDigest": "b5b096042b78354bf2b2c21bff56e3c0fea00fe34cf32c89088c6688f26a8d42",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
