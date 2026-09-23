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
  "archiveDigest": "8d364d4b9e92d8eeb2d7b6c6726a4a1d2e75656f5457001d8c04ba8330dc2a61",
  "specDigest": "2162c33ca4bcb152b5622faba69cb763123294e7d66cd50561410e7aa99ce24a",
  "tasksDigest": "3eca060e910da8df8960f43842ce7663b473b0baf6cceb373ee77b9a4422f2fc",
  "evidenceDigest": "899ff74ebc6ad291177557a337575fce1ba5b3cc304f2d85853d7bb686cf1b1b",
  "knownGaps": []
}
```
