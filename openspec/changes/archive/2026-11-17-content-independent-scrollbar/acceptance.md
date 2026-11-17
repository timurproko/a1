# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Unicode, raw controls, and ANSI-interrupted graphemes cannot displace the exposed scrollbar from its reserved terminal column.
- Scrolling, resizing, dock changes, selection, and cached updates retain current rail bounds without painting over covering surfaces.
- Supported links, source copy, image transport, cursor state, and comparison-profile presentation retain their existing behavior.
- Green edit-result blocks retain their owning background after nested ANSI resets without flattening deliberate nested colors.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "content-independent-scrollbar",
  "sourcePr": 967,
  "archive": "openspec/changes/archive/2026-11-17-content-independent-scrollbar/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-content-independent-scrollbar/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "0744623bc6cf9d544187aeee40633f57fc51afcb",
  "acceptanceScenarios": [
    "Unicode, raw controls, and ANSI-interrupted graphemes cannot displace the exposed scrollbar from its reserved terminal column.",
    "Scrolling, resizing, dock changes, selection, and cached updates retain current rail bounds without painting over covering surfaces.",
    "Supported links, source copy, image transport, cursor state, and comparison-profile presentation retain their existing behavior.",
    "Green edit-result blocks retain their owning background after nested ANSI resets without flattening deliberate nested colors."
  ],
  "archiveDigest": "a63f6ec62f0aff699574888edcd0d1b70b78f6cd8ba75473cbea5c704d42dbc7",
  "specDigest": "3ffc21fed7e7513f4c9e3010db36a82dd40e1b157efa9d7771656cff5a687041",
  "tasksDigest": "3c98f3e2052e2cb59908dcf8fd68e6f9956c5c30e5a62398e07dd8ff454167c2",
  "evidenceDigest": "7e6ea3511cfb99fd60cd2b633e68e049aa7b6ea57e6008a768563c5d31086ba7",
  "knownGaps": []
}
```
