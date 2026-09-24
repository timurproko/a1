# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A fitting canonical prompt chip moves intact to a continuation row instead of splitting internally.
- Text-paste, image, file, folder, and URL chips retain their exact labels, links, timestamps, and copyable text after wrapping.
- Oversized chips remain width-bounded while ordinary bracketed text and `a1 pi` retain their existing wrapping behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-prompt-chips-unbroken",
  "sourcePr": 574,
  "archive": "openspec/changes/archive/2026-09-23-keep-prompt-chips-unbroken/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-keep-prompt-chips-unbroken/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "4bb30e18ac3303797334847de8653c73632fafac",
  "acceptanceScenarios": [
    "A fitting canonical prompt chip moves intact to a continuation row instead of splitting internally.",
    "Text-paste, image, file, folder, and URL chips retain their exact labels, links, timestamps, and copyable text after wrapping.",
    "Oversized chips remain width-bounded while ordinary bracketed text and `a1 pi` retain their existing wrapping behavior."
  ],
  "archiveDigest": "b020f5e332049e8a297c4910ced9ce88c4e2dd1da109bb64950bfd32a0e7c42b",
  "specDigest": "a76a89a3ef83d65273c41e74152deee3aeb87f58df34b527cab306d4515979a2",
  "tasksDigest": "39b7b1a1bd2163a2a9cd2d4dacc925e28ecdb9d3268097bc1c2517aa4873d7ce",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
