# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In a checkout with two pi-tui copies, importing by package name, by the hoisted path, and by pinned Pi's path yields the same class objects, in dist mode and in source mode, and launch prints no identity warning.
- The manifest declares no `imports` alias and no `postinstall`; `npm ci --ignore-scripts` installs a launchable tree without any repair step.
- Exact-package preparation records install and identity phases only, and every governance check passes on the rewritten imports.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resolve-pi-tui-at-loader",
  "sourcePr": 479,
  "archive": "openspec/changes/archive/2026-09-18-resolve-pi-tui-at-loader/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-resolve-pi-tui-at-loader/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "9b757076b52e8c4ca34bc36b2e44a749f5bb9461",
  "acceptanceScenarios": [
    "In a checkout with two pi-tui copies, importing by package name, by the hoisted path, and by pinned Pi's path yields the same class objects, in dist mode and in source mode, and launch prints no identity warning.",
    "The manifest declares no `imports` alias and no `postinstall`; `npm ci --ignore-scripts` installs a launchable tree without any repair step.",
    "Exact-package preparation records install and identity phases only, and every governance check passes on the rewritten imports."
  ],
  "archiveDigest": "ed325e7e85aacca79403047f820e77a512fc1b168d077eefa27d595263372d05",
  "specDigest": "ed5858e2e100f11d556a551dcad370afba23de336040fa13cc815aabcd7798a5",
  "tasksDigest": "66bb90275a727801fca7e6dfc18516034d63bb3f014fe8747e281ff3af226089",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
