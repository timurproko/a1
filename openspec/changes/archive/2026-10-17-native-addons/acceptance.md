# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Supported packages contain no executable built from A1 sources; both native components load as Node-API 9 addons.
- Launch instances retain platform containment, process identity, terminal restoration, and ownership-verified cleanup.
- Guardian failure leaves a Node-hosted watcher to restore the terminal and clean Unix groups, with the documented node-wide kill limitation.
- Resident server, holder, attach, probe, and maintenance roles run through the immutable Node entry while terminal bytes remain native.
- Terminal-host role dispatch and the session-writer lock share one verified addon on every supported target.
- Damaged certified releases recover only from matching installed package bytes and remain unusable when trusted repair is unavailable.
- Native artifact manifests, package inventory, publication, and selected validation describe addons without executable-mode assumptions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "native-addons",
  "sourcePr": 794,
  "archive": "openspec/changes/archive/2026-10-17-native-addons/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-native-addons/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "19f347926938f89320a1b107db292491a3299b2d",
  "acceptanceScenarios": [
    "Supported packages contain no executable built from A1 sources; both native components load as Node-API 9 addons.",
    "Launch instances retain platform containment, process identity, terminal restoration, and ownership-verified cleanup.",
    "Guardian failure leaves a Node-hosted watcher to restore the terminal and clean Unix groups, with the documented node-wide kill limitation.",
    "Resident server, holder, attach, probe, and maintenance roles run through the immutable Node entry while terminal bytes remain native.",
    "Terminal-host role dispatch and the session-writer lock share one verified addon on every supported target.",
    "Damaged certified releases recover only from matching installed package bytes and remain unusable when trusted repair is unavailable.",
    "Native artifact manifests, package inventory, publication, and selected validation describe addons without executable-mode assumptions."
  ],
  "archiveDigest": "a4aba872c05649aad7f22d2a4482d97af8ff84b60c9e0f2b1af920ac2c520765",
  "specDigest": "2c1f3aeb8ac6f6037f6d682b1744aa63950bee99f8212fc2b01a24e1c240acc9",
  "tasksDigest": "8fa01b9ea531165d03205606b409eb14eaf52ed3753cdc8f3aeba889d594aa7d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
