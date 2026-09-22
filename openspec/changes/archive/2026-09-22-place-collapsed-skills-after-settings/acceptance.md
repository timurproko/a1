# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Collapsed skill presentation lists one `skills` command immediately after `settings`.
- Remaining built-ins retain their relative order through `quit`, followed by resources in their existing order.
- Expanded skill presentation and the `a1 pi` comparison retain their existing command catalogs.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-collapsed-skills-after-settings",
  "sourcePr": 545,
  "archive": "openspec/changes/archive/2026-09-22-place-collapsed-skills-after-settings/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-place-collapsed-skills-after-settings/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "b8672719ba8191ed71d5cd8ab149183b2b315361",
  "acceptanceScenarios": [
    "Collapsed skill presentation lists one `skills` command immediately after `settings`.",
    "Remaining built-ins retain their relative order through `quit`, followed by resources in their existing order.",
    "Expanded skill presentation and the `a1 pi` comparison retain their existing command catalogs."
  ],
  "archiveDigest": "11b3ef72cb01c222cabbc82a95cf700d5183510f332547e49c49c4dc508f6f52",
  "specDigest": "1b473075bc3361fbf60d202b916e3117849b3c7a46ccf1ce04975dca813dba8f",
  "tasksDigest": "de0f9f53012be921e597dbb2c39a790b5b70541667feb3d62726e2e5aa58bc49",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
