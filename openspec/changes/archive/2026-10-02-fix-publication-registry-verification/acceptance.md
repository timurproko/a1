# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Registry verification succeeds when exact-version and dist-tag resources serve the validated pair even if package-wide metadata remains stale.
- Both package identities, versions, integrity values, shasums, and requested tags must match before publication continues.
- Missing, malformed, or mismatched exact resources exhaust only the existing bounded allowance and fail closed.
- Immutable reruns skip matching uploads and retain required Windows, Linux, and macOS published-pair smoke.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-publication-registry-verification",
  "sourcePr": 659,
  "archive": "openspec/changes/archive/2026-10-02-fix-publication-registry-verification/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-02-fix-publication-registry-verification/acceptance.md",
  "finalizedDate": "2026-10-02",
  "specBaseSha": "d6923b601d61e01bae00c8c7d6f8041334976b3a",
  "acceptanceScenarios": [
    "Registry verification succeeds when exact-version and dist-tag resources serve the validated pair even if package-wide metadata remains stale.",
    "Both package identities, versions, integrity values, shasums, and requested tags must match before publication continues.",
    "Missing, malformed, or mismatched exact resources exhaust only the existing bounded allowance and fail closed.",
    "Immutable reruns skip matching uploads and retain required Windows, Linux, and macOS published-pair smoke."
  ],
  "archiveDigest": "81a396223fe6013968d1513c9a270c4458e7842009b6ed7cb8df006f37ef764c",
  "specDigest": "e7465b044058f8810fd7107f0b05694dd4b60bd2f5a2d2e9983e9269498cc9ff",
  "tasksDigest": "5f66d245f9e3be6e8171f719909d1fa3a1707a085f833312b18a2a717420eb52",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
