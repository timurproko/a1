# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A completion interrupted by a Windows handle inside the worktree reports `partial` once and is finished by rerunning the same command, which removes only residue whose files are disposable or identical to the journaled head.
- A residue containing an edited, foreign, linked, or nested-repository path is retained and its offending paths are listed under `residual-content`.
- A disposable root still locked after the retry budget blocks with `disposable-path-locked` before any journal transition, leaving the worktree and its Git pointer intact.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resume-locked-worktree-removal",
  "sourcePr": 453,
  "archive": "openspec/changes/archive/2026-09-17-resume-locked-worktree-removal/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-resume-locked-worktree-removal/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "e52df799b075b3a87d8cdc7539fdf2ac8db2090e",
  "acceptanceScenarios": [
    "A completion interrupted by a Windows handle inside the worktree reports `partial` once and is finished by rerunning the same command, which removes only residue whose files are disposable or identical to the journaled head.",
    "A residue containing an edited, foreign, linked, or nested-repository path is retained and its offending paths are listed under `residual-content`.",
    "A disposable root still locked after the retry budget blocks with `disposable-path-locked` before any journal transition, leaving the worktree and its Git pointer intact."
  ],
  "archiveDigest": "467cbfa50e91bd30af88c85ba8c0d0aea25554401574a937558d2e72fc310031",
  "specDigest": "f79877e629b1b811ae7c158c6d4ff443a8e3bdcb88510c1e0a515ff60fa74dba",
  "tasksDigest": "73e2f8d347ca74ce66186f123222f9f2069793aca852dffad74cfc09bb81f4fe",
  "evidenceDigest": "5bc6e6ea1a976d3b1c89680f6e96d8b6c398f930082e43da353a75dd506f1171",
  "knownGaps": []
}
```
