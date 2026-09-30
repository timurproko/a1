# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 /settings shows an Agent "Prompt image limit" from 1 through 16 that defaults to 8 and applies live without restart.
- Pasting more images than the limit keeps the overflow chips under their normal screenshot labels, dims them, and shows a warning pointing to /settings.
- Submitting a draft with overflow sends only the accepted images and leaves the rejected ones out of the provider input and reusable history.
- Removing the overflow or raising the limit clears only the image-count warning while unrelated notices stay visible.
- An image prompt shows Sending… until the engine accepts it, then Working… or the extension status, while a1 pi keeps its fixed eight-image behaviour.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "configure-prompt-image-limit",
  "sourcePr": 622,
  "archive": "openspec/changes/archive/2026-09-30-configure-prompt-image-limit/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-configure-prompt-image-limit/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "061d8dcfd6a11a3d7a6b00d107a18711ab9e8773",
  "acceptanceScenarios": [
    "Bare A1 /settings shows an Agent \"Prompt image limit\" from 1 through 16 that defaults to 8 and applies live without restart.",
    "Pasting more images than the limit keeps the overflow chips under their normal screenshot labels, dims them, and shows a warning pointing to /settings.",
    "Submitting a draft with overflow sends only the accepted images and leaves the rejected ones out of the provider input and reusable history.",
    "Removing the overflow or raising the limit clears only the image-count warning while unrelated notices stay visible.",
    "An image prompt shows Sending… until the engine accepts it, then Working… or the extension status, while a1 pi keeps its fixed eight-image behaviour."
  ],
  "archiveDigest": "621270ec9a0b8bc8fa35b588b5ef60f4e8e5365e1231e2a9b9f939c7a3707143",
  "specDigest": "535897615aba85d1b92e1208f28095934968b29940935dd7dd4c95959cf25334",
  "tasksDigest": "69df99b36a91acbc94df33af693fc954121263394c69c982d4e9149bc6cbae75",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
