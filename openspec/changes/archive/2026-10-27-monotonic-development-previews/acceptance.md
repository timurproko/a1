# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A development publication from a pull request merged after a higher-numbered one is versioned above it, such as `0.2.7-dev.1218` for #828 after `0.2.7-dev.1217` for #842, and both published manifests record the pull request and source commit.
- `a1 update --develop 828` installs the preview whose manifest records pull request 828, and a number that only an older version such as `0.2.7-dev.835` carries still resolves that version.
- A number that a manifest records and another version trails is refused as ambiguous, and an unreachable registry installs nothing.
- `a1 version` on a development build prints `Current: 0.2.7-dev.1217 (#842)` and `Develop: 0.2.7-dev.1218 (#828)`, and prints the bare version with no diagnostic when a manifest records nothing.
- A manual update that meets a dead owner's transaction for another target rolls it back, reports the interrupted version, and installs the requested target, while an automatic worker still fails closed.
- A successful manual update removes `update-check.json`, and a refused one leaves it in place.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "monotonic-development-previews",
  "sourcePr": 844,
  "archive": "openspec/changes/archive/2026-10-27-monotonic-development-previews/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-27-monotonic-development-previews/acceptance.md",
  "finalizedDate": "2026-10-27",
  "specBaseSha": "35c1aad8452e7ce7e4e7fa93294e3c380a7b5473",
  "acceptanceScenarios": [
    "A development publication from a pull request merged after a higher-numbered one is versioned above it, such as `0.2.7-dev.1218` for #828 after `0.2.7-dev.1217` for #842, and both published manifests record the pull request and source commit.",
    "`a1 update --develop 828` installs the preview whose manifest records pull request 828, and a number that only an older version such as `0.2.7-dev.835` carries still resolves that version.",
    "A number that a manifest records and another version trails is refused as ambiguous, and an unreachable registry installs nothing.",
    "`a1 version` on a development build prints `Current: 0.2.7-dev.1217 (#842)` and `Develop: 0.2.7-dev.1218 (#828)`, and prints the bare version with no diagnostic when a manifest records nothing.",
    "A manual update that meets a dead owner's transaction for another target rolls it back, reports the interrupted version, and installs the requested target, while an automatic worker still fails closed.",
    "A successful manual update removes `update-check.json`, and a refused one leaves it in place."
  ],
  "archiveDigest": "5b4d97cd17f250aa7c1a703069e03b460a488e6b5d8e7764680036e3cc23b94d",
  "specDigest": "923705f1a8a17865132a4f3b1c0c533c7821e7210f7dffe167739f0d0e12fdd5",
  "tasksDigest": "0ab9df09d2f07c6fb06f53b7d774cbe662fd22da64f9dcce2efdfc5b4a465626",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
