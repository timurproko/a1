# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Launching an older stable build of bare A1 shows an Update Available notice above Working with the release, a1 update, and its changelog link.
- The notice never moves transcript rows, and when idle its last row sits on the line Working occupies above the editor.
- Hovering the notice close glyph highlights it like the settings steppers, and clicking it hides the notice until the next launch.
- A development build names a1 update --develop without a changelog line, and a1 pi keeps Pi's bordered notice in the transcript.
- Turning Update check off in /settings, or setting A1_SKIP_VERSION_CHECK, PI_OFFLINE, or CI, shows no notice and makes no registry request.
- a1 version on a stable build prints Current and Release, and a1 update never installs a lower version from the running channel.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-startup-update-notice",
  "sourcePr": 643,
  "archive": "openspec/changes/archive/2026-09-30-add-startup-update-notice/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-add-startup-update-notice/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "38530ce62d936f89153d8af0173971bf05d2d57a",
  "acceptanceScenarios": [
    "Launching an older stable build of bare A1 shows an Update Available notice above Working with the release, a1 update, and its changelog link.",
    "The notice never moves transcript rows, and when idle its last row sits on the line Working occupies above the editor.",
    "Hovering the notice close glyph highlights it like the settings steppers, and clicking it hides the notice until the next launch.",
    "A development build names a1 update --develop without a changelog line, and a1 pi keeps Pi's bordered notice in the transcript.",
    "Turning Update check off in /settings, or setting A1_SKIP_VERSION_CHECK, PI_OFFLINE, or CI, shows no notice and makes no registry request.",
    "a1 version on a stable build prints Current and Release, and a1 update never installs a lower version from the running channel."
  ],
  "archiveDigest": "7f40ea3e6c6e3a3ab430bba4dab2591a45afa8b105f4167faee71030242255dd",
  "specDigest": "a8624723a7b56bd3d89e8a00579cd77a4a4c16637c0efabc271262a583f44563",
  "tasksDigest": "2d0593ec0a44a899919fc9bcbaa3a67d40a115eda6b069c7793d4e92a5de14d5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
