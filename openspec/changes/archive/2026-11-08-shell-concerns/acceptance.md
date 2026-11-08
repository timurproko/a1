# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every slash-command and keyboard route that opens a selector or dialog (model, models, scoped models, thinking, fork, tree, trust, settings, session, login, logout, skills) opens and applies the choice exactly as before.
- Prompt history recalls the same entries before and after a session switch, a fork, or a live scope change, and a session without an identity still recalls only its own transcript.
- Pasting, image chips, prompt submission, viewport following, copy-on-select, and pointer handling behave as before, with the root exposing the chip store and viewport instead of forwarding them.
- Bare A1 still receives its viewport, background, quit-outro, suggestion, image-limit, and skills settings; the comparison profile still receives none of them.
- A failed startup now releases the session runtime registry along with every other shared resource, in the same order a normal quit uses.
- The presenter, root, constructor, and composition entries in the size ratchet shrink; the startup graph gains three files and loses about 6 KB of source.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "shell-concerns",
  "sourcePr": 885,
  "archive": "openspec/changes/archive/2026-11-08-shell-concerns/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-shell-concerns/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "040f0333a6ebcac04e98c54510a13c7576fa4165",
  "acceptanceScenarios": [
    "Every slash-command and keyboard route that opens a selector or dialog (model, models, scoped models, thinking, fork, tree, trust, settings, session, login, logout, skills) opens and applies the choice exactly as before.",
    "Prompt history recalls the same entries before and after a session switch, a fork, or a live scope change, and a session without an identity still recalls only its own transcript.",
    "Pasting, image chips, prompt submission, viewport following, copy-on-select, and pointer handling behave as before, with the root exposing the chip store and viewport instead of forwarding them.",
    "Bare A1 still receives its viewport, background, quit-outro, suggestion, image-limit, and skills settings; the comparison profile still receives none of them.",
    "A failed startup now releases the session runtime registry along with every other shared resource, in the same order a normal quit uses.",
    "The presenter, root, constructor, and composition entries in the size ratchet shrink; the startup graph gains three files and loses about 6 KB of source."
  ],
  "archiveDigest": "8c13a9efa3da124611476e5c0d2c79fada3390bb5dedafddcda9944b0197f414",
  "specDigest": "2960e7bd18d2b3e4833de8335462b86334f4d159a7df418546dcf7fe87ec9732",
  "tasksDigest": "0c7658cc5dd3da6fadca05e1ff53ee28f1a0724329e01a2df9c29921ff9d9ec7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
