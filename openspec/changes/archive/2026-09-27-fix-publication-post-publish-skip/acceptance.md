# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Development publication proceeds to Windows, Linux, and macOS published-pair smoke after its documentation review is intentionally skipped and package publication succeeds.
- A failed, cancelled, or unexpectedly skipped direct package, publication, or published-pair prerequisite blocks the dependent job and fails the aggregate.
- Release completion succeeds only after published-pair smoke succeeds, while tag, GitHub Release, and `master` mutation remain restricted to stable publication.
- A partial pair with an existing installer and missing application remains publication work and requires verification of the exact published pair.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-publication-post-publish-skip",
  "sourcePr": 600,
  "archive": "openspec/changes/archive/2026-09-27-fix-publication-post-publish-skip/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-fix-publication-post-publish-skip/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "040ba369494e17439cb33bbbc80bba958a4e1df2",
  "acceptanceScenarios": [
    "Development publication proceeds to Windows, Linux, and macOS published-pair smoke after its documentation review is intentionally skipped and package publication succeeds.",
    "A failed, cancelled, or unexpectedly skipped direct package, publication, or published-pair prerequisite blocks the dependent job and fails the aggregate.",
    "Release completion succeeds only after published-pair smoke succeeds, while tag, GitHub Release, and `master` mutation remain restricted to stable publication.",
    "A partial pair with an existing installer and missing application remains publication work and requires verification of the exact published pair."
  ],
  "archiveDigest": "3bd0588795ea43942c86db4c889698a49dd72c00241f020705e8c5f86fe9316c",
  "specDigest": "d5d62d662e9676139ac4708f1299dc34e4932ac7d2c4ef9e968cbdfbd1e369e6",
  "tasksDigest": "25d8e748f8fa80c7e9690bab9ec2cf472fa11537da333dc17b9a085252a46d41",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
