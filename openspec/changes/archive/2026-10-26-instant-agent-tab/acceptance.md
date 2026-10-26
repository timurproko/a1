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
- The empty landing shows an `a` with an aligned left stroke rather than a protruding block, and its cwd/version align with the Agent footer gutter.
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
    "The empty landing shows an `a` with an aligned left stroke rather than a protruding block, and its cwd/version align with the Agent footer gutter.",
    "The preview footer stays stable while the chip fills; its path changes from the new cwd to the resolved branch and PR together, without flashing stale metadata, while body and input are already live."
  ],
  "archiveDigest": "edab3a3fdc3e5c3baa683121e12135105b0e59a7155797003e3f38b4c8cf8156",
  "specDigest": "9c6fab3ae2ba9c0dc8405385ee319d7e04f33522f29d1f10c90973475ec854e4",
  "tasksDigest": "e75984511e879dd36dd289a2930767c9bd8095c18bbced1dfd342a266bdda3e5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
