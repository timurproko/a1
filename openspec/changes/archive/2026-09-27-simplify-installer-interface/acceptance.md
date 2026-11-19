# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Fresh installation and self-update use the same bare release and `--develop [preview-or-version]` grammar.
- Numeric and full previews resolve only to authoritative published versions, and ambiguous or absent previews fail before mutation.
- Removed `--version`, `--latest`, and `--next` installer options fail instead of acting as compatibility aliases.
- Interactive progress ends visibly at its percentage and erases stale suffix text from earlier frames.
- Redirected success, cancellation cleanup, package verification, activation, and command-precedence behavior remain unchanged.
- Help and README guidance consistently use release, develop, and preview while identifying `latest` and `next` only as npm tags.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-installer-interface",
  "sourcePr": 604,
  "archive": "openspec/changes/archive/2026-09-27-simplify-installer-interface/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-simplify-installer-interface/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "affa36fec791ebe866fe71f201deb474687a95f7",
  "acceptanceScenarios": [
    "Fresh installation and self-update use the same bare release and `--develop [preview-or-version]` grammar.",
    "Numeric and full previews resolve only to authoritative published versions, and ambiguous or absent previews fail before mutation.",
    "Removed `--version`, `--latest`, and `--next` installer options fail instead of acting as compatibility aliases.",
    "Interactive progress ends visibly at its percentage and erases stale suffix text from earlier frames.",
    "Redirected success, cancellation cleanup, package verification, activation, and command-precedence behavior remain unchanged.",
    "Help and README guidance consistently use release, develop, and preview while identifying `latest` and `next` only as npm tags."
  ],
  "archiveDigest": "01878510acc0b7beaf344805bd25bf5a3a200b6f0f972448cce2514a8879f125",
  "specDigest": "3b950b506c0b0ff2caaa2f5f8e7b93995ef2c7f9ae6bae418e420b09786d80ec",
  "tasksDigest": "ab2e957262cd9138325c710d7b796933f2e9727f9a8b5b87debcc57d63b764de",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
