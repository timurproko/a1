# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Thinking Level is the first presented surface after `/thinking`, without an ordinary-prompt flash.
- Session Tree opens from `/tree` and double Escape without an intermediate ordinary-prompt frame.
- Optional selector preparation begins after the first input-ready frame and stays outside the eager startup graph.
- A selector-load failure releases presentation and restores usable ordinary input with a visible failure.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "prevent-lazy-selector-open-flash",
  "sourcePr": 710,
  "archive": "openspec/changes/archive/2026-10-07-prevent-lazy-selector-open-flash/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-prevent-lazy-selector-open-flash/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "8c2d639328f9b4d6d9ae8fe631479d687d2b7ecb",
  "acceptanceScenarios": [
    "Thinking Level is the first presented surface after `/thinking`, without an ordinary-prompt flash.",
    "Session Tree opens from `/tree` and double Escape without an intermediate ordinary-prompt frame.",
    "Optional selector preparation begins after the first input-ready frame and stays outside the eager startup graph.",
    "A selector-load failure releases presentation and restores usable ordinary input with a visible failure."
  ],
  "archiveDigest": "46b15405901424652a7f58e45fba3aaf576d60a798b8ae41e854e6d1662707c1",
  "specDigest": "48338e27d26d747076cd413019a7f922db4de63748347e9031b53520610fbef1",
  "tasksDigest": "f472b4cfd89a2b994dd3540f216079650c5254a95bfa20772ae38b90c6a5cfb0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
