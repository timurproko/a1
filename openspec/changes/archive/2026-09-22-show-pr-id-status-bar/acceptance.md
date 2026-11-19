# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 shows the current branch's open pull request as `PR #567`-style text immediately after path and branch.
- The `PR` prefix remains footer-grey while only the numbered `#567`-style span uses the web-link style and opens the canonical GitHub PR URL.
- PR discovery and one-minute refresh remain bounded and serialized, update only changed identity, and stop on disposal.
- Missing, closed, mismatched, malformed, unavailable, or timed-out PR discovery leaves the existing footer and session unaffected.
- Narrow footer rows truncate without leaking hyperlink or color state, and `a1 pi` retains its pinned footer output.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "show-pr-id-status-bar",
  "sourcePr": 540,
  "archive": "openspec/changes/archive/2026-09-22-show-pr-id-status-bar/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-show-pr-id-status-bar/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "b26ad5dbcec4d83ea1c881a83edf045cb4ce31ad",
  "acceptanceScenarios": [
    "Bare A1 shows the current branch's open pull request as `PR #567`-style text immediately after path and branch.",
    "The `PR` prefix remains footer-grey while only the numbered `#567`-style span uses the web-link style and opens the canonical GitHub PR URL.",
    "PR discovery and one-minute refresh remain bounded and serialized, update only changed identity, and stop on disposal.",
    "Missing, closed, mismatched, malformed, unavailable, or timed-out PR discovery leaves the existing footer and session unaffected.",
    "Narrow footer rows truncate without leaking hyperlink or color state, and `a1 pi` retains its pinned footer output."
  ],
  "archiveDigest": "3c2e56f7d60310ec0aa0415b0e17a44c8793ff45e4211da668973db039bdc072",
  "specDigest": "fce2dcdce20b031b6cb40a1756d2234ead3cba88506d4ff68d2ccb361012297c",
  "tasksDigest": "8968cb7694ab91640d911511ee3237201b16dea08632373594ba09f5da50d08b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
