# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Titled bare-A1 modal frames place the title immediately below the top rule without an empty row.
- Models, Skills, Thinking, session, trust, authentication, and extension dialogs share the compact header component while retaining their body geometry and actions.
- Untitled or extension-owned custom surfaces remain unchanged, and the explicit `a1 pi` profile retains pinned presentation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-modal-title-top-gap",
  "sourcePr": 573,
  "archive": "openspec/changes/archive/2026-09-23-remove-modal-title-top-gap/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-remove-modal-title-top-gap/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "4bb30e18ac3303797334847de8653c73632fafac",
  "acceptanceScenarios": [
    "Titled bare-A1 modal frames place the title immediately below the top rule without an empty row.",
    "Models, Skills, Thinking, session, trust, authentication, and extension dialogs share the compact header component while retaining their body geometry and actions.",
    "Untitled or extension-owned custom surfaces remain unchanged, and the explicit `a1 pi` profile retains pinned presentation."
  ],
  "archiveDigest": "1de371e5f586e39c5e9293848945d85d8af6486951cef33c54b3a177dc8a02d8",
  "specDigest": "3ad06b1964d1b52522b7594bcfe066724f571800c4aaeba324097f792f430664",
  "tasksDigest": "de635125926a10365f92b8277eaa3889d7ade01c81e6c40c4ea0327df63a4158",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
