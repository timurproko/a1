# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Dead legacy owner records no longer block updates when exact process identity proves them gone, while live or uncertain records still refuse activation.
- A continuity-blocked certified update remains prepared and retries activation without reinstalling or stopping live Agents.
- The shell shows `Update prepared; activation blocked` without sensitive diagnostics or transcript content, then shows restart readiness only after activation succeeds.
- Invalid prepared proof or a superseding target clears the blocked disposition, while ordinary failures keep the existing failure handling.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-update-continuity-stale-records",
  "sourcePr": 860,
  "archive": "openspec/changes/archive/2026-11-03-fix-update-continuity-stale-records/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-03-fix-update-continuity-stale-records/acceptance.md",
  "finalizedDate": "2026-11-03",
  "specBaseSha": "47164524aec4085b000995eb692875e4ab80b190",
  "acceptanceScenarios": [
    "Dead legacy owner records no longer block updates when exact process identity proves them gone, while live or uncertain records still refuse activation.",
    "A continuity-blocked certified update remains prepared and retries activation without reinstalling or stopping live Agents.",
    "The shell shows `Update prepared; activation blocked` without sensitive diagnostics or transcript content, then shows restart readiness only after activation succeeds.",
    "Invalid prepared proof or a superseding target clears the blocked disposition, while ordinary failures keep the existing failure handling."
  ],
  "archiveDigest": "e01c298d625e7507a7a1b5de13159caa82fb7774b39ab731db9b589bfe1eb025",
  "specDigest": "e41bef87be29dda8f0ae5e663ffa3304a859a45dfa0f60da5aefdb975e152896",
  "tasksDigest": "4ace0245c431f39096916ff2d74c81dd6b08b3741977c9bf140487e480098819",
  "evidenceDigest": "e0ba16967c544f36f6fa4563927dcf624ba15a89ea0c31f545a67019d1dc711e",
  "knownGaps": []
}
```
