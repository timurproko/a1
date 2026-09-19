# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A Full regression or nightly publication lane whose one startup measurement exceeds its budget records it with a warning and a summary table and the run succeeds; stable publication still fails on that overrun.
- The triage on a green develop run opens or refreshes a package-startup candidate only when the same lane, profile, and launch kind overran on that run and the two previous runs, with the three measurements as evidence.
- A single overrun, or a key with fewer than three consecutive measurements, is reported in the triage summary and opens nothing.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "gate-startup-budget-on-persistent-overruns",
  "sourcePr": 508,
  "archive": "openspec/changes/archive/2026-09-19-gate-startup-budget-on-persistent-overruns/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-gate-startup-budget-on-persistent-overruns/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "f8e8d4ef271039d5f1f709f063b71ab6163594d1",
  "acceptanceScenarios": [
    "A Full regression or nightly publication lane whose one startup measurement exceeds its budget records it with a warning and a summary table and the run succeeds; stable publication still fails on that overrun.",
    "The triage on a green develop run opens or refreshes a package-startup candidate only when the same lane, profile, and launch kind overran on that run and the two previous runs, with the three measurements as evidence.",
    "A single overrun, or a key with fewer than three consecutive measurements, is reported in the triage summary and opens nothing."
  ],
  "archiveDigest": "5b2b9a6b5bac04b478c427aea43757a5f07ff2706bd7f8182b333197cb32fd1d",
  "specDigest": "34f08adc2cad3e9fa15276cc73be46e9eca4f34f86eddee4ff68fb281ac06edc",
  "tasksDigest": "b651bffe7fb6c102e55d4b0ffc5b439e9a9e83f580ef2806e762fe9a3d53233c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
