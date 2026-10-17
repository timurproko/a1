# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Empty resident mode presents only the hoverable add control; create and close transitions expose no provisional host state.
- The grouped launcher and `Alt+Period` create or activate one global Settings tab, while resident Agents omit `/settings`.
- Popup rows retain v2 dark styling and remain usable through mouse movement, release, hover, and click.
- Tab rename supports grapheme-safe character editing and Ctrl+Left/Ctrl+Right word movement.
- Legacy tab quotas no longer limit creation or appear in Settings, status, diagnostics, or user notices.
- Three or more working Agents retain independent complete partial-response surfaces; switching shows current output immediately and slow clients cannot block peers.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stabilize-resident-multiagent-ux",
  "sourcePr": 798,
  "archive": "openspec/changes/archive/2026-10-17-stabilize-resident-multiagent-ux/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-stabilize-resident-multiagent-ux/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "488a97fcd8da77067afd57ee5442dd79c5f88dea",
  "acceptanceScenarios": [
    "Empty resident mode presents only the hoverable add control; create and close transitions expose no provisional host state.",
    "The grouped launcher and `Alt+Period` create or activate one global Settings tab, while resident Agents omit `/settings`.",
    "Popup rows retain v2 dark styling and remain usable through mouse movement, release, hover, and click.",
    "Tab rename supports grapheme-safe character editing and Ctrl+Left/Ctrl+Right word movement.",
    "Legacy tab quotas no longer limit creation or appear in Settings, status, diagnostics, or user notices.",
    "Three or more working Agents retain independent complete partial-response surfaces; switching shows current output immediately and slow clients cannot block peers."
  ],
  "archiveDigest": "139eee4738bf6b6ea0119eb19e67ef2ecc76fac442908e92077f25f0085c0891",
  "specDigest": "2f21942ae5b4e765a6280f03e3e5958388083a29795c91fca08b3e0a186f90e8",
  "tasksDigest": "565ef1fa2563e62d0ad72b3cfaf7db0f9711abdf3a0babef1491773859c24075",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
