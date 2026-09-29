# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Each Windows lane artifact stores its envelope under `full-lanes/`, and the required job collects all four lane envelopes from one Full regression run.
- Any upload carrying lane envelopes that would archive them without the `full-lanes/` directory fails the workflow policy test.
- Shard execution, lane reconstruction, and the fail-closed four-lane aggregate keep their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-windows-lane-artifact-layout",
  "sourcePr": 632,
  "archive": "openspec/changes/archive/2026-09-29-fix-windows-lane-artifact-layout/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-fix-windows-lane-artifact-layout/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "98814fe37275f700754ecb86fff0047f17aff648",
  "acceptanceScenarios": [
    "Each Windows lane artifact stores its envelope under `full-lanes/`, and the required job collects all four lane envelopes from one Full regression run.",
    "Any upload carrying lane envelopes that would archive them without the `full-lanes/` directory fails the workflow policy test.",
    "Shard execution, lane reconstruction, and the fail-closed four-lane aggregate keep their existing behavior."
  ],
  "archiveDigest": "7be6ac2e3ba1bbb9c1311a0a3f255472b40b3ff4b1409dde89b189763c226ed1",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "8458645a0fef72453fe389246b72f2c79b2bbb6fa2e5b8f90986c68bb80442ef",
  "evidenceDigest": "f39b615b975a0121f55f309ea2bd033e78a8d4f3626bad21abfb74243013d108",
  "knownGaps": []
}
```
