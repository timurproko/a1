# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Empty Resume Session searches show the comma-separated regex and exact-phrase guidance in faint suggestion styling, and real query text replaces it without changing matching behavior.
- The ordinary footer presents search, navigation, selection, scope, session actions, dynamic path state, rename, and close guidance in one standard semantic row.
- Narrow layouts preserve the complete `Esc close` suffix, while delete confirmation, status feedback, loading, and existing session operations retain their behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refine-resume-session-search-guidance",
  "sourcePr": 704,
  "archive": "openspec/changes/archive/2026-10-07-refine-resume-session-search-guidance/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-refine-resume-session-search-guidance/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "59de51109758b1e7c04691c44d39ed1dc7595fd5",
  "acceptanceScenarios": [
    "Empty Resume Session searches show the comma-separated regex and exact-phrase guidance in faint suggestion styling, and real query text replaces it without changing matching behavior.",
    "The ordinary footer presents search, navigation, selection, scope, session actions, dynamic path state, rename, and close guidance in one standard semantic row.",
    "Narrow layouts preserve the complete `Esc close` suffix, while delete confirmation, status feedback, loading, and existing session operations retain their behavior."
  ],
  "archiveDigest": "ba18bf5736e1dceaf4d7017a911d28e1fb5437242f48f8641f3b1a869040b8e1",
  "specDigest": "6cdfb42b0ffdf3ae4c1aa8d146e630fef9c82d9fba790732ba26f1e880a20c53",
  "tasksDigest": "e6ffe1b7240e5448a2b325bd6502650b7d0adc89e17e5a363f1cd4b848f06a92",
  "evidenceDigest": "ed47c4a19185139bcf32e799b9b93676f02efb3467517fe59a2fff55d83bf95d",
  "knownGaps": []
}
```
