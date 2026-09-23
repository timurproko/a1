# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 shows `thinking` as `Set thinking level` and `login` as `Configure provider authentication` without angle-bracket hints or an argument-hint separator.
- Direct thinking-level arguments and provider argument completion retain their established workflows.
- Command ordering, selected-row styling, unrelated hints, and the `a1 pi` comparison presentation remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-thinking-login-command-descriptions",
  "sourcePr": 555,
  "archive": "openspec/changes/archive/2026-09-23-simplify-thinking-login-command-descriptions/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-simplify-thinking-login-command-descriptions/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "e904bb37b6c1f5664fb90a33e8a9c7118a25ce0f",
  "acceptanceScenarios": [
    "Bare A1 shows `thinking` as `Set thinking level` and `login` as `Configure provider authentication` without angle-bracket hints or an argument-hint separator.",
    "Direct thinking-level arguments and provider argument completion retain their established workflows.",
    "Command ordering, selected-row styling, unrelated hints, and the `a1 pi` comparison presentation remain unchanged."
  ],
  "archiveDigest": "e53c9a7931a13dbc1dfa92f6a57652bee55d92cc5a1fac499e6627f5f94dccbf",
  "specDigest": "5f0a8027f356ce2ec2abb4123545702c1f8d5bb5eee9b11ddef23bf7f7b3ecc0",
  "tasksDigest": "454b756e9785455379d5e8e17ae7eed338b3ebd754fc77fe1fb91f8c61c33ef3",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
