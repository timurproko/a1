# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A fresh Save draft starts one authenticated staging run without Actions navigation or repeated version input.
- Failed staging remains draft and untagged, while exact completed staging resumes without republishing.
- npm, the validated asset, master, and durable evidence complete before native publication is allowed.
- Native publication verifies the staged Release, tag, packages, asset, body, source, and master before reopening.
- The publication event never uploads npm or repairs, moves, deletes, or recreates a release tag.
- Packaged startup notes and both intentional changelog orderings remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "streamline-release-publish-handoff",
  "sourcePr": 627,
  "archive": "openspec/changes/archive/2026-09-29-streamline-release-publish-handoff/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-streamline-release-publish-handoff/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "dade587898b7e17c2c80308cfa518e88315847af",
  "acceptanceScenarios": [
    "A fresh Save draft starts one authenticated staging run without Actions navigation or repeated version input.",
    "Failed staging remains draft and untagged, while exact completed staging resumes without republishing.",
    "npm, the validated asset, master, and durable evidence complete before native publication is allowed.",
    "Native publication verifies the staged Release, tag, packages, asset, body, source, and master before reopening.",
    "The publication event never uploads npm or repairs, moves, deletes, or recreates a release tag.",
    "Packaged startup notes and both intentional changelog orderings remain unchanged."
  ],
  "archiveDigest": "ee5de9c750c3d4a3fefcf23bcc0d3beef8d5611ffc38d7abf77b2b22359b2060",
  "specDigest": "e03b9a3b069c4620aff3a618872c58fba798acfb6938a565d24b5cfbcbc5f196",
  "tasksDigest": "6633b7d8bcfc9348402759bda4969bc504344cd8bac0522bf5eaf24da814d2d0",
  "evidenceDigest": "accceebc42bb2b0c639d69b3aa9bb41f61fec483dff8fc60de58a876cb4d3232",
  "knownGaps": []
}
```
