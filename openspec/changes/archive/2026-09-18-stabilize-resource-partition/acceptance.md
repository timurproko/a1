# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A copy helper that reports a complete prepared result and outlives the cleanup grace is terminated, and the clipboard writer receives exactly the prepared text once rather than an empty string.
- Cancelling a copy request after its helper reported a result but before delivery settles as canceled without calling the clipboard writer.
- The Windows exclusive-handle fixture's hold and probe run against a warmed interpreter under their unchanged 10 s bounds.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stabilize-resource-partition",
  "sourcePr": 472,
  "archive": "openspec/changes/archive/2026-09-18-stabilize-resource-partition/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-stabilize-resource-partition/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "a516426e09b81de7a8906364d7bed3d218c6a344",
  "acceptanceScenarios": [
    "A copy helper that reports a complete prepared result and outlives the cleanup grace is terminated, and the clipboard writer receives exactly the prepared text once rather than an empty string.",
    "Cancelling a copy request after its helper reported a result but before delivery settles as canceled without calling the clipboard writer.",
    "The Windows exclusive-handle fixture's hold and probe run against a warmed interpreter under their unchanged 10 s bounds."
  ],
  "archiveDigest": "c6bfe8ca9568cc6050d425f25ab96f02254bf75df646a32c4da6ad53ce620135",
  "specDigest": "5841b1e771909ebc9975081910275d53ba612b369c7f5f5e672fe7cf1ac05a90",
  "tasksDigest": "3a465497039f16e12bd57359b66c065fec16a2b210901339200a500da6921512",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
