# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Two sessions created through one host in one process share one dispatcher installation, one theme application, one changelog announcement, one package-update probe, and one set of startup trace phases, and carry distinct ids.
- A session that writes the HTTP idle timeout re-installs the process dispatcher, and the host reports that session as the origin.
- Asking the host for an id that names a live session is rejected without creating a session; a disposed session's id can be used again; generated ids never collide with a live one.
- Disposing the host aborts its signal and disposes every session still live; disposing the application disposes the host last.
- Bare `a1` and `a1 pi` sessions start, show the same startup notices, apply the same theme and accent, and quit as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-engine-host",
  "sourcePr": 734,
  "archive": "openspec/changes/archive/2026-10-09-pi-engine-host/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-pi-engine-host/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "3d761a48bbd6bc864062c1f75056d4dfa8171d30",
  "acceptanceScenarios": [
    "Two sessions created through one host in one process share one dispatcher installation, one theme application, one changelog announcement, one package-update probe, and one set of startup trace phases, and carry distinct ids.",
    "A session that writes the HTTP idle timeout re-installs the process dispatcher, and the host reports that session as the origin.",
    "Asking the host for an id that names a live session is rejected without creating a session; a disposed session's id can be used again; generated ids never collide with a live one.",
    "Disposing the host aborts its signal and disposes every session still live; disposing the application disposes the host last.",
    "Bare `a1` and `a1 pi` sessions start, show the same startup notices, apply the same theme and accent, and quit as before."
  ],
  "archiveDigest": "a3afccb8d6d3ebadf492d9ed1cbf8806e17a88a1dcfe7e571e4d0f07336d9371",
  "specDigest": "7b0d809c284cc11e946ee93a092989e978bf1a6670b16da58609ff96b2926e43",
  "tasksDigest": "d5308a6eea58aeb0ae741d01cd70885b755a77301ddcac40126180756042605e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
