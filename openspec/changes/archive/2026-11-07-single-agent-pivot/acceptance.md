# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare `a1` and `a1 --session` with a session id open the owned single-agent UI in one directly attached process, and the exit hint prints the `a1 --session` resume command.
- `a1 solo` and `a1 tabs` are silent no-ops; help and usage list neither.
- Killing the UI restores the terminal and the launcher prints the unclean-exit notice with the resume command.
- A second `a1` on an open session is refused with the fork offer, and a crashed writer's lock is reclaimed within seconds.
- Settings show no Tab Bar section or Time format, and submitted prompts carry no timestamp.
- Update offers only Auto and No; an existing Notify setting reads as Auto, and an installed update shows the `installed; restart to update` status.
- The published package contains no native artifacts and CI provisions no Rust or Zig toolchain.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "single-agent-pivot",
  "sourcePr": 878,
  "archive": "openspec/changes/archive/2026-11-07-single-agent-pivot/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-07-single-agent-pivot/acceptance.md",
  "finalizedDate": "2026-11-07",
  "specBaseSha": "4560b55065a016d93ce0d029d9ddaa14e04dd448",
  "acceptanceScenarios": [
    "Bare `a1` and `a1 --session` with a session id open the owned single-agent UI in one directly attached process, and the exit hint prints the `a1 --session` resume command.",
    "`a1 solo` and `a1 tabs` are silent no-ops; help and usage list neither.",
    "Killing the UI restores the terminal and the launcher prints the unclean-exit notice with the resume command.",
    "A second `a1` on an open session is refused with the fork offer, and a crashed writer's lock is reclaimed within seconds.",
    "Settings show no Tab Bar section or Time format, and submitted prompts carry no timestamp.",
    "Update offers only Auto and No; an existing Notify setting reads as Auto, and an installed update shows the `installed; restart to update` status.",
    "The published package contains no native artifacts and CI provisions no Rust or Zig toolchain."
  ],
  "archiveDigest": "ed248a6dd456dd02437ecbf17755d8e3cd656c02866dcdbd5510a1bef69972e7",
  "specDigest": "d099d1b3028a57be598b8674929774c8e493e87697c439ef4cb5d96131c67107",
  "tasksDigest": "74d455958ad1fb7811958f8931aaa8158cce1d1d7dc41c73bbd83c4f14898ff9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
