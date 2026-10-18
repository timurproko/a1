# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A publication whose upload npm serves within thirty minutes passes registry verification in the same run and proceeds to the published-pair smoke.
- The publish job timeout outlasts the full registry verification window.
- Registry verification still compares exact bytes and dist-tags for both packages.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "npm-registry-visibility-window",
  "sourcePr": 804,
  "archive": "openspec/changes/archive/2026-10-18-npm-registry-visibility-window/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-18-npm-registry-visibility-window/acceptance.md",
  "finalizedDate": "2026-10-18",
  "specBaseSha": "cc0a011dc4593e45687222077f4d87a1c27c143a",
  "acceptanceScenarios": [
    "A publication whose upload npm serves within thirty minutes passes registry verification in the same run and proceeds to the published-pair smoke.",
    "The publish job timeout outlasts the full registry verification window.",
    "Registry verification still compares exact bytes and dist-tags for both packages."
  ],
  "archiveDigest": "adc9e5390c31235ec93553d3f9421a0e9003a0de6dc32b86b8540a191f8a8fc1",
  "specDigest": "bda85a22ee4ba30eaf2b8e8e2b4584e04b00c1e9717faf1abe6c2f894f9f4aab",
  "tasksDigest": "4cf96289a32e1dcaa145f95523c3d68e53751c1e473195c150735c85d834e281",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
