# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The release command prepares the draft, starts source validation, and exits without waiting for a draft save.
- Choosing Publish release on the reviewed draft publishes both exact packages to npm latest and prepares the reopening pull request.
- Publication that fails before either package reaches npm returns the Release to draft and removes its unconsumed tag.
- Publication that fails after a package reaches npm keeps the Release and tag and completes by rerunning the same run.
- Only an authorized human publishing the source-bound draft can start stable npm publication.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publish-on-native-release",
  "sourcePr": 629,
  "archive": "openspec/changes/archive/2026-09-29-publish-on-native-release/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-publish-on-native-release/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "5143bd864416bc67b450dc851bbdafff26b466ca",
  "acceptanceScenarios": [
    "The release command prepares the draft, starts source validation, and exits without waiting for a draft save.",
    "Choosing Publish release on the reviewed draft publishes both exact packages to npm latest and prepares the reopening pull request.",
    "Publication that fails before either package reaches npm returns the Release to draft and removes its unconsumed tag.",
    "Publication that fails after a package reaches npm keeps the Release and tag and completes by rerunning the same run.",
    "Only an authorized human publishing the source-bound draft can start stable npm publication."
  ],
  "archiveDigest": "ad428f9fc7b29c79b6777584d71ed0621a4b8d80cb59122b67227645f67198df",
  "specDigest": "563465111b666d88fd2ba6428772dcdd1fdb2b24cf8a976416b759ca2d59b32a",
  "tasksDigest": "2e1ff56ee3823e4ce921090aa5dd1897bff6e6447086a342f4c16d9c93374239",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
