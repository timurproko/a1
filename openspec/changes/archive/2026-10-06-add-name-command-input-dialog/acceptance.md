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
  "specBaseSha": "1dc3913502e0172a1000eb43c95954941a34035d",
  "acceptanceScenarios": [
    "Argument-free `/name` opens a compact `Session Name` input with standard submit and cancel hints.",
    "Enter applies a non-empty name through the direct workflow and reports its normalized result.",
    "Escape and whitespace-only submission restore the ordinary prompt without changing the session name or adding a result.",
    "Direct naming with `/name Project` remains immediate and the explicit `a1 pi` comparison behavior remains unchanged."
  ],
  "archiveDigest": "b6485272d3799f7e8759583f9e50a768d5b7a7d526a186e635b25e5536fbb888",
  "specDigest": "a84cbe0135e85c8d3cb920fece95470c40d92e24f2fa30b36436a0c2d189b246",
  "tasksDigest": "edeff7bc9b6ab7513a54f83b4aab64e0d51fcbb0d2ab31140e92d8eb29e4e849",
  "evidenceDigest": "0f9f4c4dd65315120586f7c347a878def1930cabf2f594ba336f05376c86dd2c",
  "knownGaps": []
}
```
