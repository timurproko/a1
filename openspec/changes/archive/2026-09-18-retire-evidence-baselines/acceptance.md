# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The Pi production boundary check reports every finding in the current tree and carries no approval snapshot; on the current tree it reports zero.
- The architecture gate fails naming the baseline file and path when a baseline records a source path that does not exist, and passes when every recorded path resolves.
- The tree no longer holds the two snapshot baselines or the boundary baseline generator, and no script or test references them.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "retire-evidence-baselines",
  "sourcePr": 471,
  "archive": "openspec/changes/archive/2026-09-18-retire-evidence-baselines/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-retire-evidence-baselines/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "a516426e09b81de7a8906364d7bed3d218c6a344",
  "acceptanceScenarios": [
    "The Pi production boundary check reports every finding in the current tree and carries no approval snapshot; on the current tree it reports zero.",
    "The architecture gate fails naming the baseline file and path when a baseline records a source path that does not exist, and passes when every recorded path resolves.",
    "The tree no longer holds the two snapshot baselines or the boundary baseline generator, and no script or test references them."
  ],
  "archiveDigest": "d9ddbc3b688abcb769f59a884eaff9c4ee6eeed8f5e36f302eb75856ead82a3b",
  "specDigest": "3ffea87d61609de280d6df984a949796e2ed35e8c8f0d1b3db3c596aadc2de7e",
  "tasksDigest": "ce47e42c64b9e2f927682bb81976f2744d4e150c61b4f4a64c00d5c219224c20",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
