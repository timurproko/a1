# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A tab that keeps streaming while another tab is viewed shows its current content the moment it is selected, with no burst of delayed frames.
- A background tab's terminal output never appears in a client viewing another tab.
- Background tab status, rename, stop, and input isolation behave as before, and direct `a1 solo` / `a1 pi` sessions are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-background-tab-rendering",
  "sourcePr": 778,
  "archive": "openspec/changes/archive/2026-10-16-fix-background-tab-rendering/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-fix-background-tab-rendering/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "512a078cc484f93123a2a37ae2d5210bbd180c20",
  "acceptanceScenarios": [
    "A tab that keeps streaming while another tab is viewed shows its current content the moment it is selected, with no burst of delayed frames.",
    "A background tab's terminal output never appears in a client viewing another tab.",
    "Background tab status, rename, stop, and input isolation behave as before, and direct `a1 solo` / `a1 pi` sessions are unchanged."
  ],
  "archiveDigest": "bf54454fac870921393c681d52a3875a779a13d55fb79c344672e62cdfb849ef",
  "specDigest": "3f9c880a6ee6cbc3717a4955f01800922fbbd6d8d96da402aa5317768762826c",
  "tasksDigest": "cf3eff3f1cc2a20720c7a46d346874769fb6b34c45c52b99eebf93b9c9563a70",
  "evidenceDigest": "ebfd501fd9c0613a672b7e160701f1c4d22a3afb8cb2c18ce7ba1aa42c3e72e6",
  "knownGaps": []
}
```
