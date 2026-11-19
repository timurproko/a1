# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `a1 help` and `a1 version` produce the established help and version outcomes without launching an interactive runtime.
- Direct install, remove/uninstall, and list commands dispatch the same isolated A1-profile operations as their compatibility aliases.
- Direct update syntax keeps stable and development self-update distinct from model, all-extension, and single-package updates.
- Help, focused diagnostics, and README examples lead with direct commands while existing flags and supported `a1 pi` forms remain functional aliases.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-cli-command-spelling",
  "sourcePr": 567,
  "archive": "openspec/changes/archive/2026-09-23-simplify-cli-command-spelling/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-simplify-cli-command-spelling/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "47351772ae064146df120c209b68d74a26486928",
  "acceptanceScenarios": [
    "`a1 help` and `a1 version` produce the established help and version outcomes without launching an interactive runtime.",
    "Direct install, remove/uninstall, and list commands dispatch the same isolated A1-profile operations as their compatibility aliases.",
    "Direct update syntax keeps stable and development self-update distinct from model, all-extension, and single-package updates.",
    "Help, focused diagnostics, and README examples lead with direct commands while existing flags and supported `a1 pi` forms remain functional aliases."
  ],
  "archiveDigest": "b0d84259f1ce2b4b71dbb21321256ecfa17946b2f128aa9a8242fe5ba7433a43",
  "specDigest": "fe9d318d25b33fd0f7826c0c1fe800aec2842654e3df1a8edb93610dbc2f6b9f",
  "tasksDigest": "8bbedff3109e6dc4e850eca498f2ad2b08811d52a342b8e8bb752ee93dd018ed",
  "evidenceDigest": "a043865dff4a0f8de724b201006b7be182ac3a82db4a33018c3f4c2473338339",
  "knownGaps": []
}
```
