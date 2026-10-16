# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Resident multi-agent tabs send every valid prompt image without recovery-journal size rejection.
- Completed prompts retire and compact without waiting for another user submission.
- Interrupted recovery restores verified images and removes unavailable attachment tokens without replaying the prompt.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-resident-image-prompt-admission",
  "sourcePr": 790,
  "archive": "openspec/changes/archive/2026-10-16-fix-resident-image-prompt-admission/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-fix-resident-image-prompt-admission/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "2148ffa3ea377ca0bc50be3d16cd0abf03f20293",
  "acceptanceScenarios": [
    "Resident multi-agent tabs send every valid prompt image without recovery-journal size rejection.",
    "Completed prompts retire and compact without waiting for another user submission.",
    "Interrupted recovery restores verified images and removes unavailable attachment tokens without replaying the prompt."
  ],
  "archiveDigest": "50fdf99b5ad473aefb2b239dfd37ed10f52a3243a51d6efc1b063aa14bfb8fd2",
  "specDigest": "162d72b3e1da6847f2c1c866010df763a2af7fc5bd80e47474037b4e6fd16d4c",
  "tasksDigest": "ccf9537cf984d26db3b5ed72ef2795463424144fc40ac347a201492ce8b99190",
  "evidenceDigest": "726dc46f6c56d2abf7a027547ba63f13556965d465c89e774dd169b588bac96d",
  "knownGaps": []
}
```
