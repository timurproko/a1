# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The exact installer tarball is dependency-free, payload-minimal, executable after Windows packing, and runnable from an isolated global prefix.
- Stable, development, exact-version, cancellation, retry, existing-install, launcher-ownership, warning-capture, redaction, and terminal-restoration contracts are covered by deterministic tests.
- Application and installer versions, digests, provenance publication, registry verification, and partial-publication recovery are synchronized in one release workflow.
- Every newly published pair is exercised from the registry in isolated prefixes on each release platform before stable release records move.
- The README prefers the controlled installer forms while preserving all direct npm recovery commands.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-silent-a1-installer",
  "sourcePr": 591,
  "archive": "openspec/changes/archive/2026-09-25-add-silent-a1-installer/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-add-silent-a1-installer/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "92e3ed375ce7d16e52dbb8b0a9d64ac829701bff",
  "acceptanceScenarios": [
    "The exact installer tarball is dependency-free, payload-minimal, executable after Windows packing, and runnable from an isolated global prefix.",
    "Stable, development, exact-version, cancellation, retry, existing-install, launcher-ownership, warning-capture, redaction, and terminal-restoration contracts are covered by deterministic tests.",
    "Application and installer versions, digests, provenance publication, registry verification, and partial-publication recovery are synchronized in one release workflow.",
    "Every newly published pair is exercised from the registry in isolated prefixes on each release platform before stable release records move.",
    "The README prefers the controlled installer forms while preserving all direct npm recovery commands."
  ],
  "archiveDigest": "e584fd4c60c6cbd45538618ea254bf5b4319afc971f7c49ed2e13e88e91fbd04",
  "specDigest": "ff202347e5c57edfbcb2f81f62ebbb4bc69e9f38d8af7b38b3be0141b84a6b90",
  "tasksDigest": "211ba4790c0e1e80612d8ac1be117965068c976f6b2a6371657695d7b3da12ec",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
