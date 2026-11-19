# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The first paint of `/settings` is blank rows and the next paint shows the settings rows; no frame contains `Loading settings…`.
- A settings module load failure still prints its message on the first row.
- A search that matches nothing shows `No settings found.`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "open-settings-without-loading-placeholder",
  "sourcePr": 515,
  "archive": "openspec/changes/archive/2026-09-19-open-settings-without-loading-placeholder/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-open-settings-without-loading-placeholder/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "2ed58dcee863b7a145011fbb522f788489841440",
  "acceptanceScenarios": [
    "The first paint of `/settings` is blank rows and the next paint shows the settings rows; no frame contains `Loading settings…`.",
    "A settings module load failure still prints its message on the first row.",
    "A search that matches nothing shows `No settings found.`."
  ],
  "archiveDigest": "972c09dd0939738401d298d153bc0f289e3130f1c8105527cb29dd8c0acd2898",
  "specDigest": "34eb9b2514bd9c10aa6c44845ec06c7bfe1cab6047790f6d227817767b626c92",
  "tasksDigest": "8bf152837355da27851d7357b071d379ac8b4458409ceca423a86f38f09f4d31",
  "evidenceDigest": "8bd06fc8c5f3f152e5d17ce5244b4861742e5bfcc3188498a3de8267b4e00869",
  "knownGaps": []
}
```
