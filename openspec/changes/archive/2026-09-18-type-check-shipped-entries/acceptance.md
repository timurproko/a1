# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run typecheck` checks both projects and reports zero diagnostics; an implicit-any parameter or an unchecked optional launch-context value in `bin/` fails it.
- Every `bin/` file is unchanged in behavior: syntax-checked, `a1 --version` runs, and the suites that execute or read the entries pass.
- The packed tarball ships the checked `bin/` files themselves; nothing is emitted or copied.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "type-check-shipped-entries",
  "sourcePr": 480,
  "archive": "openspec/changes/archive/2026-09-18-type-check-shipped-entries/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-type-check-shipped-entries/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "2d467c8b430c9d4182d35f13ae2a0b1e7f13bb50",
  "acceptanceScenarios": [
    "`npm run typecheck` checks both projects and reports zero diagnostics; an implicit-any parameter or an unchecked optional launch-context value in `bin/` fails it.",
    "Every `bin/` file is unchanged in behavior: syntax-checked, `a1 --version` runs, and the suites that execute or read the entries pass.",
    "The packed tarball ships the checked `bin/` files themselves; nothing is emitted or copied."
  ],
  "archiveDigest": "5270e3618a11782e7f19557ced13620edc78646803fae8992c0287f1b8cd44eb",
  "specDigest": "63ee50dce2572c0221dcd965564ebe6409c6f3bbba3e0ca5909a9b12df21a1a1",
  "tasksDigest": "e4ea093da45bd678a44040d13ba31ce5fc44e1eb767791067306890458d24bd8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
