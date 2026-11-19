# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Argument-free `/name` opens a compact `Session Name` input with standard submit and cancel hints.
- Enter applies a non-empty name through the direct workflow and reports its normalized result.
- Escape and whitespace-only submission restore the ordinary prompt without changing the session name or adding a result.
- Direct naming with `/name Project` remains immediate and the explicit `a1 pi` comparison behavior remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-name-command-input-dialog",
  "sourcePr": 694,
  "archive": "openspec/changes/archive/2026-10-06-add-name-command-input-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-add-name-command-input-dialog/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "13032a9aade7f3e66fdab0f7849e976226c0f19e",
  "acceptanceScenarios": [
    "Argument-free `/name` opens a compact `Session Name` input with standard submit and cancel hints.",
    "Enter applies a non-empty name through the direct workflow and reports its normalized result.",
    "Escape and whitespace-only submission restore the ordinary prompt without changing the session name or adding a result.",
    "Direct naming with `/name Project` remains immediate and the explicit `a1 pi` comparison behavior remains unchanged."
  ],
  "archiveDigest": "7d832c6d14a31f2289b8f02c171e8cfd014f571d60c5b4537f2096d565709e4e",
  "specDigest": "cb223355fee391ef1db847572da0fcae3d0fbf18e7395b479eee93eeac33e621",
  "tasksDigest": "edeff7bc9b6ab7513a54f83b4aab64e0d51fcbb0d2ab31140e92d8eb29e4e849",
  "evidenceDigest": "057ad39d9d3dc0509feb18f8c636e020d8d1c2f0816b9f4be41ca8e16bc74828",
  "knownGaps": []
}
```
