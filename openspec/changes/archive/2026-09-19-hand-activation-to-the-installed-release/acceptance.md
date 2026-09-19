# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- After npm installs a tree whose manifest lists `activate-v1`, the updater starts that tree's `bin/activate.js`, advances its journal phases and progress bar from the entry's events, and runs no materialization, certification, warmup, or supervision step itself.
- A tree whose manifest declares no contract the updater serves is activated in-process exactly as before, and the update still succeeds.
- A delegated activation that reports `failed`, exits non-zero, or exits without `completed` fails the update with the entry's own bounded reason and rolls back to the prior release.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hand-activation-to-the-installed-release",
  "sourcePr": 512,
  "archive": "openspec/changes/archive/2026-09-19-hand-activation-to-the-installed-release/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-hand-activation-to-the-installed-release/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "0b91f020922c8399be6f51add594fa57199d0d90",
  "acceptanceScenarios": [
    "After npm installs a tree whose manifest lists `activate-v1`, the updater starts that tree's `bin/activate.js`, advances its journal phases and progress bar from the entry's events, and runs no materialization, certification, warmup, or supervision step itself.",
    "A tree whose manifest declares no contract the updater serves is activated in-process exactly as before, and the update still succeeds.",
    "A delegated activation that reports `failed`, exits non-zero, or exits without `completed` fails the update with the entry's own bounded reason and rolls back to the prior release."
  ],
  "archiveDigest": "85e803cb1186de21168d3de2773860f0621ce6dbb0ccb13efa5c0bd9b6d15db9",
  "specDigest": "39d31433b3d1940d26a55c1d5dc4bf990adb10d9f491beb0971de305529c0211",
  "tasksDigest": "ff00739668cb572ebab7f39077e717fb22bb7036722fa911330c9adcdd8348f1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
