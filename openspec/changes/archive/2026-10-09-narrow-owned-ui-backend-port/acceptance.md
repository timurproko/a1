# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The session shell, its root, the exit notice, and composition compile against `OwnedUiSessionBackend`, and the architecture check fails when a file under `src/app` names `PiEngineAdapter`.
- `PiEngineAdapter` declares that it implements `OwnedUiSessionBackend`, and the contract test pins each sub-port to exactly its declared members: 49 neutral plus 9 transitional pinned.
- No member outside the transitional `pinned` sub-port takes or returns `unknown`, and the moved workflow, catalog, and settings payload types name no Pi package type.
- Saving a default thinking level, including `max`, and changing a setting in the pinned settings selector behave as before and are not routed through `OwnedUiCommand`.
- Bare `a1` and `a1 pi` sessions start, run workflows, and quit as before; the startup graph grows only by the new contract module, to 156 files.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "narrow-owned-ui-backend-port",
  "sourcePr": 730,
  "archive": "openspec/changes/archive/2026-10-09-narrow-owned-ui-backend-port/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-narrow-owned-ui-backend-port/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "4d5bcbfd74fbdc630429e58ed6f5e7ece05deb60",
  "acceptanceScenarios": [
    "The session shell, its root, the exit notice, and composition compile against `OwnedUiSessionBackend`, and the architecture check fails when a file under `src/app` names `PiEngineAdapter`.",
    "`PiEngineAdapter` declares that it implements `OwnedUiSessionBackend`, and the contract test pins each sub-port to exactly its declared members: 49 neutral plus 9 transitional pinned.",
    "No member outside the transitional `pinned` sub-port takes or returns `unknown`, and the moved workflow, catalog, and settings payload types name no Pi package type.",
    "Saving a default thinking level, including `max`, and changing a setting in the pinned settings selector behave as before and are not routed through `OwnedUiCommand`.",
    "Bare `a1` and `a1 pi` sessions start, run workflows, and quit as before; the startup graph grows only by the new contract module, to 156 files."
  ],
  "archiveDigest": "d0120da8bb6241f6a686c286388d92b5d5328a0b73143d8b2278f7f1e0511aea",
  "specDigest": "dc1e510ec9cc5b8dd0c4761aa6031b0090e0dc5ec9777d9053a463d2eca398cc",
  "tasksDigest": "0d0f9cac5c74156583690271f89a362730bd20c61b8dff51f3ac4ba4a80b0e10",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
