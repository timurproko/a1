# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Develop published-pair smoke invokes the installer with `--develop` and the exact preview version instead of removed `--version` syntax.
- Release published-pair smoke remains a bare installer invocation.
- The corrected harness installs and launches the exact immutable `.604` pair successfully in isolated Windows prefixes.
- Focused release policy rejects removed installer target options before publication.
- Exact manifest verification, evidence output, cleanup, native matrix breadth, completion, and aggregate requirements remain unchanged.
- `.604` remains immutable and its failed native lanes and aggregate remain failed evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-published-installer-target-grammar",
  "sourcePr": 606,
  "archive": "openspec/changes/archive/2026-09-27-align-published-installer-target-grammar/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-align-published-installer-target-grammar/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "4fbeff681ae2198e04d02a08040530e88a9f48d8",
  "acceptanceScenarios": [
    "Develop published-pair smoke invokes the installer with `--develop` and the exact preview version instead of removed `--version` syntax.",
    "Release published-pair smoke remains a bare installer invocation.",
    "The corrected harness installs and launches the exact immutable `.604` pair successfully in isolated Windows prefixes.",
    "Focused release policy rejects removed installer target options before publication.",
    "Exact manifest verification, evidence output, cleanup, native matrix breadth, completion, and aggregate requirements remain unchanged.",
    "`.604` remains immutable and its failed native lanes and aggregate remain failed evidence."
  ],
  "archiveDigest": "d22d335a89a642b6960d1d650021b50028cdd67d015dc61fa3e187ed0af97473",
  "specDigest": "b0d7c6f760c72c705d14520961575362fe6533f8b16dc2e1cb28922841d0b223",
  "tasksDigest": "0df9a09f63df3ba236669d0b03c6fefdbfdc2a72ad67f18ca02d6fa6ba27b67b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
