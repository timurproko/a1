# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A newly requested Agent immediately shows one selected tab with an empty transcript, ruled prompt, visual caret, and both footer rows without loading text or child cursor.
- Closing that pending tab by shortcut or context menu immediately restores the previous Agent or landing without delivering the pending prompt to another tab.
- Cancellation skips a queued launch or stops an already registered Agent holder and child; late replies and registry updates reveal no ghost tab or close a subsequent Agent.
- A later Agent opens normally with its own deferred input, and an existing Agent remains usable throughout cancellation.
- Every supported accent keeps its own visibly distinct pending and active chip shades without a blue-only color transition.
- The pending footer matches the real Agent's left and right gutters and available branch and pull-request display, while keeping new-tab usage at zero.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "instant-agent-tab",
  "sourcePr": 837,
  "archive": "openspec/changes/archive/2026-10-26-instant-agent-tab/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-instant-agent-tab/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "939b1527555dbc80fb9c10f02be89cafdcc3121e",
  "acceptanceScenarios": [
    "A newly requested Agent immediately shows one selected tab with an empty transcript, ruled prompt, visual caret, and both footer rows without loading text or child cursor.",
    "Closing that pending tab by shortcut or context menu immediately restores the previous Agent or landing without delivering the pending prompt to another tab.",
    "Cancellation skips a queued launch or stops an already registered Agent holder and child; late replies and registry updates reveal no ghost tab or close a subsequent Agent.",
    "A later Agent opens normally with its own deferred input, and an existing Agent remains usable throughout cancellation.",
    "Every supported accent keeps its own visibly distinct pending and active chip shades without a blue-only color transition.",
    "The pending footer matches the real Agent's left and right gutters and available branch and pull-request display, while keeping new-tab usage at zero."
  ],
  "archiveDigest": "404adcb39bc4dbd12d3a2c2868e5ee126a524e77b60ebce1d70b17411e4ee1f3",
  "specDigest": "dbbe3de0befb45cd4bc55c224c3f5822e035e9579d5e3048df193bb845fd94d3",
  "tasksDigest": "df89db07943429aae8b9b5f209873311e24427376f822f39126e94ec8a7ba41e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
