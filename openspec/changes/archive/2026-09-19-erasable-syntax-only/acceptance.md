# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run typecheck` passes with `erasableSyntaxOnly` enabled; a constructor parameter property or an `enum` under `src/` or `test/` fails it with the erasable-syntax diagnostic.
- `npm run check:architecture`, `check:code-documentation`, the pinned Pi ledger and inventory checks pass with the re-pinned startup baseline.
- The governance, contract, foundation, feature, integration, composition, and app suites pass with the rewritten constructors.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "erasable-syntax-only",
  "sourcePr": 497,
  "archive": "openspec/changes/archive/2026-09-19-erasable-syntax-only/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-erasable-syntax-only/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "c1a60e54475ec450f3c604e34a8ad15008941250",
  "acceptanceScenarios": [
    "`npm run typecheck` passes with `erasableSyntaxOnly` enabled; a constructor parameter property or an `enum` under `src/` or `test/` fails it with the erasable-syntax diagnostic.",
    "`npm run check:architecture`, `check:code-documentation`, the pinned Pi ledger and inventory checks pass with the re-pinned startup baseline.",
    "The governance, contract, foundation, feature, integration, composition, and app suites pass with the rewritten constructors."
  ],
  "archiveDigest": "0b0c516cf9af295d54efe7393d23839bad63d53983d88e720514e8d3c54fc915",
  "specDigest": "723b89e8105a58a26f696791b4ba82682cc77695e89cae29622333593ec2db9b",
  "tasksDigest": "fed18337bde6b469a2c46368b1532d668074a64f2cf8d5846a1901f4cb22ebe2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
