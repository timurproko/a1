# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- npm run release drafts a changelog that starts after the newest published stable GitHub Release whose tag is on origin, so a leftover local or deleted tag no longer shortens it, and preparation stops when no such Release exists.
- Publishing a draft whose note was not edited uploads the candidate-validated tarballs with their validated integrity, without building guardians or running validation lanes.
- Publishing a draft whose note was edited replaces only the packaged release-notes.json with the published body and proves every other entry, mode, and the installer unchanged before npm.
- A missing, expired, or mismatched candidate package fails before npm with a rerun-candidate-validation instruction, and the Release returns to draft.
- Before either npm upload, publication requires npm >= 11.5.1 and completes the trusted-publishing exchange for both packages; a refusal uploads nothing and names the calling workflow and npm-publish environment to register.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publish-reuses-validated-candidate",
  "sourcePr": 644,
  "archive": "openspec/changes/archive/2026-09-30-publish-reuses-validated-candidate/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-publish-reuses-validated-candidate/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "877e326a2ae25962fcfb510f48a7311aa867ead7",
  "acceptanceScenarios": [
    "npm run release drafts a changelog that starts after the newest published stable GitHub Release whose tag is on origin, so a leftover local or deleted tag no longer shortens it, and preparation stops when no such Release exists.",
    "Publishing a draft whose note was not edited uploads the candidate-validated tarballs with their validated integrity, without building guardians or running validation lanes.",
    "Publishing a draft whose note was edited replaces only the packaged release-notes.json with the published body and proves every other entry, mode, and the installer unchanged before npm.",
    "A missing, expired, or mismatched candidate package fails before npm with a rerun-candidate-validation instruction, and the Release returns to draft.",
    "Before either npm upload, publication requires npm >= 11.5.1 and completes the trusted-publishing exchange for both packages; a refusal uploads nothing and names the calling workflow and npm-publish environment to register."
  ],
  "archiveDigest": "97f5614f29b3998e0fb69d8d64ed53cddfdf40faf26ce083a33cd13cc15bb01d",
  "specDigest": "dc428f05a8331ba9aee16c051308e4b33e1a3a3e3c09e4e79a1b5e23bdb7fe19",
  "tasksDigest": "8a60dbe951e59560d55bc4ee51a36d9fe0e8a9b3f3b2ae4d7ddd1f0663e532e1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
