# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A newly requested Agent immediately shows one selected tab with an empty transcript, ruled prompt, visual caret, and both footer rows without loading text or child cursor.
- Closing that pending tab by shortcut or context menu immediately restores the previous Agent or landing without delivering the pending prompt to another tab.
- Cancellation skips a queued launch or stops an already registered Agent holder and child; late replies and registry updates reveal no ghost tab or close a subsequent Agent.
- A stopped Agent's late bridge request cannot detach the client while that Agent is still the server's viewed tab; the older Agent stays running.
- A later Agent opens normally with its own deferred input, and an existing Agent remains usable throughout cancellation.
- Every supported accent keeps its own visibly distinct pending and active chip shades without a blue-only color transition.
- The pending footer matches the real Agent's left and right gutters and available branch and pull-request display, while keeping new-tab usage at zero.
- On first real draw, the selected Agent chip fills left-to-right from its initializing shade to its configured active accent, then remains solid, without shifting titles or click targets.
- The empty landing shows a clean `a1` wordmark without the stray full block at the left of its middle row.
- The preview footer stays stable while the chip fills; the latest real Agent footer appears once at fill completion while its body and input are already live.

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
    "A stopped Agent's late bridge request cannot detach the client while that Agent is still the server's viewed tab; the older Agent stays running.",
    "A later Agent opens normally with its own deferred input, and an existing Agent remains usable throughout cancellation.",
    "Every supported accent keeps its own visibly distinct pending and active chip shades without a blue-only color transition.",
    "The pending footer matches the real Agent's left and right gutters and available branch and pull-request display, while keeping new-tab usage at zero.",
    "On first real draw, the selected Agent chip fills left-to-right from its initializing shade to its configured active accent, then remains solid, without shifting titles or click targets.",
    "The empty landing shows a clean `a1` wordmark without the stray full block at the left of its middle row.",
    "The preview footer stays stable while the chip fills; the latest real Agent footer appears once at fill completion while its body and input are already live."
  ],
  "archiveDigest": "a5b0bc915315c9619ae51537f2ce0f0c0f58a8aed1a29b09738dc22fe12892b7",
  "specDigest": "92f172430404d0001cdec5c45765ef0891c3ba3150c4ee31906c606f4724bb7a",
  "tasksDigest": "7f6eab796ef9821f95f223f9c292417e099adb29442f0685fde7d43b956f0978",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
