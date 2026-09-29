# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Screenshot attachments submit without the pinned-package configuration error after startup environment mutation.
- Lazy image modules continue resolving from the package identity validated at startup rather than an altered environment path.
- Same-root configuration remains idempotent while conflicting package roots fail before changing runtime identity.
- Missing configuration and unavailable retained installations produce distinct bounded diagnostics.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-pinned-pi-runtime-root",
  "sourcePr": 624,
  "archive": "openspec/changes/archive/2026-09-29-fix-pinned-pi-runtime-root/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-fix-pinned-pi-runtime-root/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "f11d40df1ab428d54fd8a0acbb0e374fd584ca23",
  "acceptanceScenarios": [
    "Screenshot attachments submit without the pinned-package configuration error after startup environment mutation.",
    "Lazy image modules continue resolving from the package identity validated at startup rather than an altered environment path.",
    "Same-root configuration remains idempotent while conflicting package roots fail before changing runtime identity.",
    "Missing configuration and unavailable retained installations produce distinct bounded diagnostics."
  ],
  "archiveDigest": "982626ecc93903feafdc9cdcb2cba4794b5e8335fa662287c99d22ceeefd88b9",
  "specDigest": "dc76b1321acfbb816bc806db5b29d1bf4e3d226262caaa5544504051bac96467",
  "tasksDigest": "20380ff23e49924913d74a6a74116a8196b8bafe77ab738c8fc7c09fbb943170",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
