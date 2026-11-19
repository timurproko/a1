# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Same-name pasted paths use the shortest distinguishing parent suffix with forward slashes instead of random hashes.
- Repeated normalized paths reuse stable labels while folder, file, and image-file icons remain unchanged.
- Copy, history, and submission expand each disambiguated chip to its exact full path.
- Oversized path lists remain bounded using each path's longest deterministic label.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "disambiguate-same-name-path-chips",
  "sourcePr": 737,
  "archive": "openspec/changes/archive/2026-10-09-disambiguate-same-name-path-chips/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-disambiguate-same-name-path-chips/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "afac338a9f8cd44d8720a53d3a84a57f7babcc29",
  "acceptanceScenarios": [
    "Same-name pasted paths use the shortest distinguishing parent suffix with forward slashes instead of random hashes.",
    "Repeated normalized paths reuse stable labels while folder, file, and image-file icons remain unchanged.",
    "Copy, history, and submission expand each disambiguated chip to its exact full path.",
    "Oversized path lists remain bounded using each path's longest deterministic label."
  ],
  "archiveDigest": "a4ae7688d7600afcf575af8ab1294fc951e9deb65ed293022669aa4e91190606",
  "specDigest": "fb19ecc78d05ad0b93d677a9ba7867a7b3e5446507c7879fcbc0eadfdf343c62",
  "tasksDigest": "28daea89b4361bb4ae71c6026a009484f53b93d0508550288ae68d5d757a6c1e",
  "evidenceDigest": "3397a43dfe034d3c782b3c0423cd9f807e4b25ea1c3bdd7e7c2eb6cd1be2b2ba",
  "knownGaps": []
}
```
