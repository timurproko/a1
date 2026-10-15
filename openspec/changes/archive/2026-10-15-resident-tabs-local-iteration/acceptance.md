# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- `npm run preflight` runs validation's fast governance gates in order, stops at the first failure, and reports the rule identifier validation would report
- Every resident chaos run prints its seed, records its executed action schedule, and names that seed and report in every violation
- `--replay` re-issues a recorded chaos schedule in its recorded order and reports any action it cannot apply as divergence
- A local development build with `TERMINAL_HOST_PREBUILT_VT` links the CI-published terminal library and runs native tests without Zig
- A prebuilt terminal library whose version, target, or bytes differ from its manifest fails the build in one line without falling back to Zig
- `node scripts/development/fetch-terminal-vt.mjs` downloads the newest published terminal library for this platform into `.artifacts/terminal-vt/`
- Builds with `CI` set ignore `TERMINAL_HOST_PREBUILT_VT`

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-local-iteration",
  "sourcePr": 770,
  "archive": "openspec/changes/archive/2026-10-15-resident-tabs-local-iteration/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-resident-tabs-local-iteration/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "491c2151e1eae63168ab379b911df51ce2623a70",
  "acceptanceScenarios": [
    "`npm run preflight` runs validation's fast governance gates in order, stops at the first failure, and reports the rule identifier validation would report",
    "Every resident chaos run prints its seed, records its executed action schedule, and names that seed and report in every violation",
    "`--replay` re-issues a recorded chaos schedule in its recorded order and reports any action it cannot apply as divergence",
    "A local development build with `TERMINAL_HOST_PREBUILT_VT` links the CI-published terminal library and runs native tests without Zig",
    "A prebuilt terminal library whose version, target, or bytes differ from its manifest fails the build in one line without falling back to Zig",
    "`node scripts/development/fetch-terminal-vt.mjs` downloads the newest published terminal library for this platform into `.artifacts/terminal-vt/`",
    "Builds with `CI` set ignore `TERMINAL_HOST_PREBUILT_VT`"
  ],
  "archiveDigest": "0339aab79c91c16d8b62577ac54d16572c353f1e7f8ab61b64d030fbecfcd047",
  "specDigest": "6b606bf3e545ec8179144439156736570e8621140db0b8c90ea808353e3762eb",
  "tasksDigest": "1114043fac969ae078dfac278b1cd203b65cc4d96270e696cd111a5ffa1f8550",
  "evidenceDigest": "472cf758f77adab8fe8d4dac157a0a72d4ff2e421259881523ee5626163dafac",
  "knownGaps": []
}
```
