# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Merged allowlisted documentation revisions qualify without an implementation association.
- Mixed, code, release-note, acceptance, malformed, and introduced-change revisions remain fail-closed.
- Eligibility requires exact registered identity, successful current-head validation, and current target ancestry.
- A live remote topic ref prevents standalone documentation cleanup from becoming eligible.
- Eligible evidence still uses clean-content, journaled non-force removal, and compare-and-delete safeguards.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "support-standalone-documentation-cleanup",
  "sourcePr": 716,
  "archive": "openspec/changes/archive/2026-10-08-support-standalone-documentation-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-support-standalone-documentation-cleanup/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "09d5aa846de3f9517e3445f408a8aa6576df47f7",
  "acceptanceScenarios": [
    "Merged allowlisted documentation revisions qualify without an implementation association.",
    "Mixed, code, release-note, acceptance, malformed, and introduced-change revisions remain fail-closed.",
    "Eligibility requires exact registered identity, successful current-head validation, and current target ancestry.",
    "A live remote topic ref prevents standalone documentation cleanup from becoming eligible.",
    "Eligible evidence still uses clean-content, journaled non-force removal, and compare-and-delete safeguards."
  ],
  "archiveDigest": "50ee66ea1e8c36f5a392def271bf8ff9762b56a4961209331ef56be5f79ee519",
  "specDigest": "1c8670139d77b0c3ec2e6183260a18ecc46de6e10a23b1c0d7d93973979f6be8",
  "tasksDigest": "93d91f23fd4e26529e3c3421022261b50fb46dda4ab5f57a304e3fc83712261d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
