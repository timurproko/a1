# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Production-shaped backlog setup limits outstanding payload writes to eight while retaining all 42 releases and 128 JavaScript payload files per release.
- Defender-enabled Windows Node 22 and Node 24 package-contract lanes complete setup and cleanup on their first execution.
- The exact packaged worker, cleanup assertions, phase evidence, and 120-second test timeout remain unchanged.
- Product-identity governance accepts only the regenerated coordinates and fingerprints for the moved fixture occurrences.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-windows-package-cleanup-flake",
  "sourcePr": 656,
  "archive": "openspec/changes/archive/2026-10-01-fix-windows-package-cleanup-flake/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-fix-windows-package-cleanup-flake/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "f1e4872ef0daba66ddadd2c86e41cfd3597f1c88",
  "acceptanceScenarios": [
    "Production-shaped backlog setup limits outstanding payload writes to eight while retaining all 42 releases and 128 JavaScript payload files per release.",
    "Defender-enabled Windows Node 22 and Node 24 package-contract lanes complete setup and cleanup on their first execution.",
    "The exact packaged worker, cleanup assertions, phase evidence, and 120-second test timeout remain unchanged.",
    "Product-identity governance accepts only the regenerated coordinates and fingerprints for the moved fixture occurrences."
  ],
  "archiveDigest": "5b3e706373a220764d55b893d438e2a13e5404baa249a57b50f460f6abd66ec3",
  "specDigest": "059c1f631b61b238c44510304bf7949f87ba5bb6aebd2cb8ffc51594e4259c60",
  "tasksDigest": "d94352383f358fcdfa9386fc6fb49e10ee12a61623dbf1950f45e7f187432618",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
