# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A development publication lists its jobs as `Develop / Build process guardian` instead of `Validate and publish development packages / Build process guardian`.
- Candidate validation and stable publication prefix their jobs with `Candidate /` and `Release /`.
- Publication job ids, inputs, permissions, conditions, and the called `publish.yml` are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "short-publication-caller-names",
  "sourcePr": 773,
  "archive": "openspec/changes/archive/2026-10-15-short-publication-caller-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-short-publication-caller-names/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "37bc59a76963c39810546df04ba76146ba8095e5",
  "acceptanceScenarios": [
    "A development publication lists its jobs as `Develop / Build process guardian` instead of `Validate and publish development packages / Build process guardian`.",
    "Candidate validation and stable publication prefix their jobs with `Candidate /` and `Release /`.",
    "Publication job ids, inputs, permissions, conditions, and the called `publish.yml` are unchanged."
  ],
  "archiveDigest": "a86750d57e4b62747f954e8c6412bf6490e3af809c12cf57fe20333ef2dc0f8e",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "787d19606982b2e14ce1d9e8f0e9f943cabed4ea2c775dd782122c27fa190e77",
  "evidenceDigest": "78fa93761fba4d586716beb586a1bbc49145c51fb3999b26f9b642dbcedd1fc8",
  "knownGaps": []
}
```
