# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A piped or redirected `a1` or `a1 --session` from a package that carries the terminal host runs the direct UI and never starts the attach client or contacts the resident host
- `a1` launched from a terminal still opens resident tabs
- Pull-request packaged suites and Full regression pack a candidate that carries this platform's release terminal host
- A CI validation lane that packs without this platform's terminal host fails before `npm pack` and names the missing artifact

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-packaged-validation",
  "sourcePr": 772,
  "archive": "openspec/changes/archive/2026-10-15-resident-tabs-packaged-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-resident-tabs-packaged-validation/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "286bda1dc432d3ecbb87e0b8efdea16808979737",
  "acceptanceScenarios": [
    "A piped or redirected `a1` or `a1 --session` from a package that carries the terminal host runs the direct UI and never starts the attach client or contacts the resident host",
    "`a1` launched from a terminal still opens resident tabs",
    "Pull-request packaged suites and Full regression pack a candidate that carries this platform's release terminal host",
    "A CI validation lane that packs without this platform's terminal host fails before `npm pack` and names the missing artifact"
  ],
  "archiveDigest": "39c08c86fa7d438daa0d4a8d0c4be49d25e89f988358f93103d8145f5096ba40",
  "specDigest": "8bb883b8b6784e8803a2fb5838f783857f864afa85544113e6c1fbea6c55b4fd",
  "tasksDigest": "7c0db46ad04048963488d316cad436fe14abfa108cc9406e897cec4a21888fe5",
  "evidenceDigest": "a711ec4dfa11b5c7bcf533aa725b24d6fcdd30f14242795c8e76666ff0f1aa13",
  "knownGaps": []
}
```
