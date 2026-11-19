# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `node scripts/governance/check-architecture.mjs` passes with an empty `unreachableModules` list and no module under `src/integrations/pi/tui-runtime/` named `conformance.ts`.
- `test/integrations/pi/tui-runtime/conformance.test.ts` passes its three cases with the probe imported from `test/support/pi-tui-runtime-conformance.ts`.
- The startup graph baseline is unchanged at 152 files and 1,432,617 source bytes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "relocate-tui-runtime-conformance",
  "sourcePr": 490,
  "archive": "openspec/changes/archive/2026-09-18-relocate-tui-runtime-conformance/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-relocate-tui-runtime-conformance/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "3beb45f4936f5c6a8dec1dda5c1614fbc357ebad",
  "acceptanceScenarios": [
    "`node scripts/governance/check-architecture.mjs` passes with an empty `unreachableModules` list and no module under `src/integrations/pi/tui-runtime/` named `conformance.ts`.",
    "`test/integrations/pi/tui-runtime/conformance.test.ts` passes its three cases with the probe imported from `test/support/pi-tui-runtime-conformance.ts`.",
    "The startup graph baseline is unchanged at 152 files and 1,432,617 source bytes."
  ],
  "archiveDigest": "af70fe95275a60e445ee85bee429d35f0a52ac415681b29c3ed8cae62ef6c636",
  "specDigest": "39d85373729d6ae6a8925270f3edfaa764307a6ffb7fb1e49c4804d738a72280",
  "tasksDigest": "f80394fb432927950252312782a6ba46e6a3c9dab8ea25d4f885b1709202cd4f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
