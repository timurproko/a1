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
  "specBaseSha": "eb88c681627b31e24ca3d03168704dc53a6c3f49",
  "acceptanceScenarios": [
    "Bare A1 /settings shows an Agent \"Prompt image limit\" from 1 through 16 that defaults to 8 and applies live without restart.",
    "Pasting more images than the limit keeps the overflow chips under their normal screenshot labels, dims them, and shows a warning pointing to /settings.",
    "Submitting a draft with overflow sends only the accepted images and leaves the rejected ones out of the provider input and reusable history.",
    "Removing the overflow or raising the limit clears only the image-count warning while unrelated notices stay visible.",
    "An image prompt shows Sending… until the engine accepts it, then Working… or the extension status, while a1 pi keeps its fixed eight-image behaviour."
  ],
  "archiveDigest": "5de195dc54e08f2f30c738647c76d489c3f9e44b6f60b79fd4c96b87fb974746",
  "specDigest": "449210694e576da45d64628b9cd130948248141bc4f41e49766ce87291229095",
  "tasksDigest": "69df99b36a91acbc94df33af693fc954121263394c69c982d4e9149bc6cbae75",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
