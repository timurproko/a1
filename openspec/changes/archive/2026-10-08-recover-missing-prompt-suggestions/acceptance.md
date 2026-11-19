# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- An eligible settled response that missed prefetch starts one settlement request and can display its current candidate.
- A first no-candidate result receives at most one sequential cache-compatible retry, with no overlapping or third request.
- Typing, cancellation, stale identity, and conversation replacement prevent scheduled or late recovery from publishing.
- A valid current candidate survives temporary readiness, focus, autocomplete, or prompt-mode blocking and appears without another request.
- Private diagnostics identify attempt origin, bounded retry, deferred presentation, display, and exhaustion without conversation or candidate text.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "recover-missing-prompt-suggestions",
  "sourcePr": 712,
  "archive": "openspec/changes/archive/2026-10-08-recover-missing-prompt-suggestions/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-recover-missing-prompt-suggestions/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "9b111cb55360e6ffa84e1e6534c3365c95be46cb",
  "acceptanceScenarios": [
    "An eligible settled response that missed prefetch starts one settlement request and can display its current candidate.",
    "A first no-candidate result receives at most one sequential cache-compatible retry, with no overlapping or third request.",
    "Typing, cancellation, stale identity, and conversation replacement prevent scheduled or late recovery from publishing.",
    "A valid current candidate survives temporary readiness, focus, autocomplete, or prompt-mode blocking and appears without another request.",
    "Private diagnostics identify attempt origin, bounded retry, deferred presentation, display, and exhaustion without conversation or candidate text."
  ],
  "archiveDigest": "c4db9f38fa376c3073c15affce7812f87cb06995485b8b5c57a5ffeea983c525",
  "specDigest": "bd1f89ac976d1773163fcd952604f9cfad40e437c296e217777498a57cf9d4c5",
  "tasksDigest": "a46e1bed48edc2c40f30cb2d1278788cd7f36cc0a877a3855fb18f05927eb28c",
  "evidenceDigest": "89f7da934369937bfc4655d423fb31c0cde48ef7fdfbb1bbb469a73dd61de4f8",
  "knownGaps": []
}
```
