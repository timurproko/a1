# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Running the installer on Node.js 22.19.0, 24, 26, or a later major passes the runtime check and proceeds with installation.
- Running the installer on Node.js older than 22.19.0 exits with status 1 and prints only `a1 needs a newer Node.js: you have v20.11.0, install 22.19 or later` for v20.11.0.
- The application and installer packages declare `engines.node` as `>=22.19.0`, so npm no longer warns on newer Node.js majors.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "support-current-node-releases",
  "sourcePr": 855,
  "archive": "openspec/changes/archive/2026-10-31-support-current-node-releases/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-31-support-current-node-releases/acceptance.md",
  "finalizedDate": "2026-10-31",
  "specBaseSha": "27f992af0ceff4dfc40d49586bdc3cf02956f435",
  "acceptanceScenarios": [
    "Running the installer on Node.js 22.19.0, 24, 26, or a later major passes the runtime check and proceeds with installation.",
    "Running the installer on Node.js older than 22.19.0 exits with status 1 and prints only `a1 needs a newer Node.js: you have v20.11.0, install 22.19 or later` for v20.11.0.",
    "The application and installer packages declare `engines.node` as `>=22.19.0`, so npm no longer warns on newer Node.js majors."
  ],
  "archiveDigest": "76b85e5149854baf839955d3ea0643090b5d89ad0d1666bedd96bb7c4fb795c1",
  "specDigest": "1ab52f5cf40ede3e570a9bc80caff3119d7d9497676d8f4e41774cc1ead27812",
  "tasksDigest": "9e6e8d1d3319dcebc6dc6d305e649d0db03950455ca837558de72ddc229d4fdf",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
