# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare `a1` on a profile whose only Agent was closed earlier and left a stopped record starts a new Agent in the launch cwd and shows its first drawn frame.
- The stopped record is dropped from the registry and the new Agent takes a fresh `tab-` identity, while an empty profile still starts `tab-1`.
- A running Agent beside stopped records is viewed as before and nothing new starts.
- Admission never selects a stopped record as the initial view, and the tab it names is the tab `attach.start` starts.
- A first registry list with nothing to show paints the landing with `+` and the clock instead of an empty screen, and a listed starting tab keeps its first-draw gate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-attach-starts-first-agent",
  "sourcePr": 845,
  "archive": "openspec/changes/archive/2026-10-27-resident-attach-starts-first-agent/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-27-resident-attach-starts-first-agent/acceptance.md",
  "finalizedDate": "2026-10-27",
  "specBaseSha": "41369d4421adb1a2654d7d07d212865826935837",
  "acceptanceScenarios": [
    "Bare `a1` on a profile whose only Agent was closed earlier and left a stopped record starts a new Agent in the launch cwd and shows its first drawn frame.",
    "The stopped record is dropped from the registry and the new Agent takes a fresh `tab-` identity, while an empty profile still starts `tab-1`.",
    "A running Agent beside stopped records is viewed as before and nothing new starts.",
    "Admission never selects a stopped record as the initial view, and the tab it names is the tab `attach.start` starts.",
    "A first registry list with nothing to show paints the landing with `+` and the clock instead of an empty screen, and a listed starting tab keeps its first-draw gate."
  ],
  "archiveDigest": "05ac89de2fd896c93ab4f0f60ccae3b8603c327fd9c5e6d18a4813ea2e694f34",
  "specDigest": "e67cdedac49fa8f64e4a4b5b15811b462b77ab137455ae28c36d421554114f92",
  "tasksDigest": "5059ab207b6025eb1f0ffe21b2de77f4e67f1440435958156d851994a39e4683",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
