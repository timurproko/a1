# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run typecheck`, `check:architecture`, `check:code-documentation`, `check:names`, and the repository-governance suite pass with both new baselines current under their `--check` modes.
- The public API and feature matrix refreshers run against Pi 0.84.2 in a scratch install produce the exports and feature rows the 0.85.1 reviewer found by hand.
- The upgrade report suite covers the API delta and new-feature sections, blocked verdicts, kept copies, the sync comment, and marker-bounded refresh; the driver reports `Pi 0.85.1 is current` against the pin.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-adoption-matrix",
  "sourcePr": 496,
  "archive": "openspec/changes/archive/2026-09-19-pi-upgrade-adoption-matrix/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-pi-upgrade-adoption-matrix/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "30546e1d74f5f0f5edbf6a0b9cdb71f28f1436a1",
  "acceptanceScenarios": [
    "`npm run typecheck`, `check:architecture`, `check:code-documentation`, `check:names`, and the repository-governance suite pass with both new baselines current under their `--check` modes.",
    "The public API and feature matrix refreshers run against Pi 0.84.2 in a scratch install produce the exports and feature rows the 0.85.1 reviewer found by hand.",
    "The upgrade report suite covers the API delta and new-feature sections, blocked verdicts, kept copies, the sync comment, and marker-bounded refresh; the driver reports `Pi 0.85.1 is current` against the pin."
  ],
  "archiveDigest": "b385f7e3d5546e65e8afcf692e30fa833d77b4d81a769cb2d9ca4c7046a269fd",
  "specDigest": "6a7b633a4894a303787dd50e5a91ac5921eadf48d538cb410f3686925ed9c272",
  "tasksDigest": "979f7d54246cb286c914cf05a983e33347bbd24f978aefc82f56bfaba129ed67",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
