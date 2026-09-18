# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The architecture gate fails on any import cycle or unreachable non-barrel module that the allowlist does not record, naming the cycle members or the module.
- The gate fails when a listed cycle, listed unreachable module, or declared process entry no longer holds, so the allowlist only shrinks.
- The committed allowlist records the current 3 cycles and 31 unreachable modules and the gate passes on the current tree.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "gate-module-graph",
  "sourcePr": 473,
  "archive": "openspec/changes/archive/2026-09-18-gate-module-graph/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-gate-module-graph/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "9973f54a715ae25b1d34cbe52c521a5175c30b4e",
  "acceptanceScenarios": [
    "The architecture gate fails on any import cycle or unreachable non-barrel module that the allowlist does not record, naming the cycle members or the module.",
    "The gate fails when a listed cycle, listed unreachable module, or declared process entry no longer holds, so the allowlist only shrinks.",
    "The committed allowlist records the current 3 cycles and 31 unreachable modules and the gate passes on the current tree."
  ],
  "archiveDigest": "b0aba7e16489d95b34767a28e5b9d63b752a2df179d33ea159e0b05692cbc72a",
  "specDigest": "f045c8af78f66751240a641ac7bdcda9028b78635e827f4053cbe79369754d70",
  "tasksDigest": "4f8a33257aa8c45d00fe100d890022f28319618e5829fdfb9342f62f6fb93859",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
