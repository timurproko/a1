# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Development publication can instantiate the reusable publisher instead of failing before jobs are created.
- Development jobs retain the publisher's narrower permissions while stable-only write-scoped jobs remain skipped.
- Repository policy rejects any publication wrapper whose caller ceiling falls below a nested publisher permission.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-development-publication-permissions",
  "sourcePr": 654,
  "archive": "openspec/changes/archive/2026-10-01-fix-development-publication-permissions/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-fix-development-publication-permissions/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "d546ab723aee89da21965d3f2fb88c774ece583d",
  "acceptanceScenarios": [
    "Development publication can instantiate the reusable publisher instead of failing before jobs are created.",
    "Development jobs retain the publisher's narrower permissions while stable-only write-scoped jobs remain skipped.",
    "Repository policy rejects any publication wrapper whose caller ceiling falls below a nested publisher permission."
  ],
  "archiveDigest": "55e77afa406cbb36711bbf3f16fba614b3ce1ab25d532d64ffb9efeef9f23faf",
  "specDigest": "97476b2c622cffd7653ccb05420f2ae94a1db24fedd65f0d8b2ba01fa1fd58ec",
  "tasksDigest": "e2b0f1493c7b0c1672cf0f568ff4b8c76cc7adabe73bc0e035810f20cc83a11a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
