# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Preparation creates or reuses one editable source-bound draft without creating a tag.
- Only an authorized human's version-only Actions dispatch can approve stable package work.
- Any pre-publication failure leaves the Release draft and target tag absent, requiring no manual tag cleanup.
- Successful publication preserves the approved body and package bytes and creates the tag at the approved source.
- Reopening contains only synchronized next-development versions and the approved note, with auto-merge disabled.
- Bare A1 presents newest-first release history while `a1 pi` retains oldest-first feed ordering.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "recover-release-with-action-approval",
  "sourcePr": 619,
  "archive": "openspec/changes/archive/2026-09-29-recover-release-with-action-approval/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-recover-release-with-action-approval/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "f11d40df1ab428d54fd8a0acbb0e374fd584ca23",
  "acceptanceScenarios": [
    "Preparation creates or reuses one editable source-bound draft without creating a tag.",
    "Only an authorized human's version-only Actions dispatch can approve stable package work.",
    "Any pre-publication failure leaves the Release draft and target tag absent, requiring no manual tag cleanup.",
    "Successful publication preserves the approved body and package bytes and creates the tag at the approved source.",
    "Reopening contains only synchronized next-development versions and the approved note, with auto-merge disabled.",
    "Bare A1 presents newest-first release history while `a1 pi` retains oldest-first feed ordering."
  ],
  "archiveDigest": "d465fa4021944a64af9757d8237e7d8d57263a07d1556d9fb4e775c57f927ffa",
  "specDigest": "56d93ccd83de37947e0c22e0038e7fa327091b41796f83ecca62f3972c98f758",
  "tasksDigest": "161d6e2f7d3dd39bca37dd2d9451dcd2612312de62cad0be5693a1180910292d",
  "evidenceDigest": "9d40eecb68474d433eb726f8779cb86c375125a99a17fb5b221abc068724b8e2",
  "knownGaps": []
}
```
