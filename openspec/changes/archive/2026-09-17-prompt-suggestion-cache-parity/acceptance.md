# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A suggestion request after a run at thinking `high` sends `reasoning: "high"`, the session identifier, thinking budgets, transport, and the loop's converted messages (compaction summaries included), and the session's thinking level, messages, and persistence stay untouched.
- Against a live provider, consecutive suggestion requests on the same conversation report cache reads for all but the first request, where the pre-change request shape reported none.
- Suggestion diagnostics record the reasoning level actually sent.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "prompt-suggestion-cache-parity",
  "sourcePr": 455,
  "archive": "openspec/changes/archive/2026-09-17-prompt-suggestion-cache-parity/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-prompt-suggestion-cache-parity/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "7ad079752e7041ed7520b2b616a0183f80d0bb1b",
  "acceptanceScenarios": [
    "A suggestion request after a run at thinking `high` sends `reasoning: \"high\"`, the session identifier, thinking budgets, transport, and the loop's converted messages (compaction summaries included), and the session's thinking level, messages, and persistence stay untouched.",
    "Against a live provider, consecutive suggestion requests on the same conversation report cache reads for all but the first request, where the pre-change request shape reported none.",
    "Suggestion diagnostics record the reasoning level actually sent."
  ],
  "archiveDigest": "682e00c6faf9733fda7b02997976212f2423cc740e171217e0af7dc6fa25edc1",
  "specDigest": "0d7df28376e09bd3a1eb3b90246db25bd03523042b09bd6d94087de070049ec5",
  "tasksDigest": "86e0404a298bc97f93e72b068892876ab83083355f65ad10984a7df8a3474cff",
  "evidenceDigest": "257288c5bde6efbbc8e1bd154127a6c4c2e792ec4cf5a4acb6ce2fe38724f895",
  "knownGaps": []
}
```
