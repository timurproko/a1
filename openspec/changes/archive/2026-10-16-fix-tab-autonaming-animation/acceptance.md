# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A new tab is named during its first agent run, and a name the user sets meanwhile is kept.
- An automatic rename plays the v2 rainbow, typewriter, and settle transition on truecolor terminals.
- Without truecolor, an automatic rename types in plainly while tab widths and click targets stay stable.
- Manual and default renames show the new name immediately without animation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-tab-autonaming-animation",
  "sourcePr": 781,
  "archive": "openspec/changes/archive/2026-10-16-fix-tab-autonaming-animation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-fix-tab-autonaming-animation/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "633517a1c1afc2519b6011204a07cf42fe8e7800",
  "acceptanceScenarios": [
    "A new tab is named during its first agent run, and a name the user sets meanwhile is kept.",
    "An automatic rename plays the v2 rainbow, typewriter, and settle transition on truecolor terminals.",
    "Without truecolor, an automatic rename types in plainly while tab widths and click targets stay stable.",
    "Manual and default renames show the new name immediately without animation."
  ],
  "archiveDigest": "fd0007153240e53190c65fdce5c1d229d7d30edec1c2243fa7399444b3b09663",
  "specDigest": "6322b711b437a901e12c059a646e3aea36f7ac990d255f7368a5669e40f3bd37",
  "tasksDigest": "c3f5dfad8ea72028c0bbf582767a32617e3f07181973eabbbe29e4daeb6d5fc2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
