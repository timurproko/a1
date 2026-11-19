# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A newly requested Agent immediately shows one selected tab with an empty transcript, ruled prompt, visual caret, and both footer rows without loading text or child cursor.
- Closing that pending tab by shortcut or context menu immediately restores the previous Agent or landing without delivering the pending prompt to another tab.
- Cancellation skips a queued launch or stops an already registered Agent holder and child; late replies and registry updates reveal no ghost tab or close a subsequent Agent.
- A stopped Agent's late bridge request cannot detach the client while that Agent is still the server's viewed tab; the older Agent stays running.
- A later Agent opens normally with its own deferred input, and an existing Agent remains usable throughout cancellation.
- Every supported accent keeps its own visibly distinct pending and active chip shades without a blue-only color transition.
- The pending footer keeps the real Agent's gutters and available model/context with usage zero, but the new Agent's path does not inherit an older Agent's branch or pull request.
- On first real draw, the selected Agent chip fills left-to-right from its initializing shade to its configured active accent, then remains solid, without shifting titles or click targets.
- The empty landing matches the approved `a1` reference: a lower-half left descender shapes the `a` without a stray full block; cwd/version stay aligned to the Agent footer gutter.
- The preview footer stays stable while the chip fills; its path changes from the new cwd to the resolved branch and PR together, without flashing stale metadata, while body and input are already live.

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
    "The pending footer keeps the real Agent's gutters and available model/context with usage zero, but the new Agent's path does not inherit an older Agent's branch or pull request.",
    "On first real draw, the selected Agent chip fills left-to-right from its initializing shade to its configured active accent, then remains solid, without shifting titles or click targets.",
    "The empty landing matches the approved `a1` reference: a lower-half left descender shapes the `a` without a stray full block; cwd/version stay aligned to the Agent footer gutter.",
    "The preview footer stays stable while the chip fills; its path changes from the new cwd to the resolved branch and PR together, without flashing stale metadata, while body and input are already live."
  ],
  "archiveDigest": "3de3b6b8af97be4e93ad374659772e3ea4d0101b2020cfdcf9d583d34aba2710",
  "specDigest": "2ef63996f3efae4693be058ea0acf98e2a1b5373d12832cf85e990d6b7366c63",
  "tasksDigest": "190a9cfc9de59e83d9849ba9ba0f11e75466c0343dc5b6ff4cfbd77e4c3762db",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
