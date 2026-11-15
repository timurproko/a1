## Context

Run: https://github.com/timurproko/a1/actions/runs/43750083689, source 52ddae3a, version 0.2.7-dev.1319, predecessor 0.2.7-dev.1307. Evidence (artifact `release-validation-0.2.7-dev.1319-published-win32-node24-node-24`): stage `update-predecessor`, child status 1, stderr `a1 update failed: A1 update recovery guardian timed out before establishing a callable launcher`; `timings.update-predecessor` 902919 ms; `processes` empty at the deadline.

Timeline from the retained records: the update journal starts 19:18:37.474Z with guardian pid 9092 running; the guardian's npm log (`2026-11-15T19_18_37_698Z`) ends at 19:20:39.217Z after `info run protobufjs@7.6.6 postinstall { code: 0 }` with no `verbose exit`; the guardian's last heartbeat is 19:20:39.771Z with a 500 ms interval; `cancel.json` is written 19:33:37.569Z; no `result.json` exists. npm and the guardian therefore vanished within one second of each other, after installation, bin links, and lifecycle scripts had completed. The prior failure (run 43738961066) lost its npm log mid-unpack instead. Installing the application alone takes 140–160 s on this runner, so the tree died when npm was within seconds of finishing.

npm always records `verbose exit` when it ends through its own handlers; the 1307 guardian's post-npm work is a few millisecond-scale file operations followed by a result write; no A1 code terminates processes other than its own warmup child; the smoke's own settlement ran at the deadline. The leading hypothesis is hosted-runner antimalware behavior monitoring remediating a hidden detached Node process started from a Temp-directory script that writes command launchers and spawns `cmd.exe` scripts. The alternative, a Node crash in the guardian after npm died, would appear as an application error record.

The public predecessor's guardian is immutable; until a pair is promoted every Windows smoke updates from 1307, so the cause must be identified from the harness side.

## Decisions

1. Sample the fixture-owned inventory while any command with a budget of at least five minutes runs, every ten seconds, using the same selection as settlement but never recording sampled identities into settlement's known set; Windows reuses process identifiers aggressively and a reused identifier must not turn settlement's identity check into a cleanup failure. Sampling never stops a process. The runner exposes `history()`; the smoke writes it as `processHistory` with sanitized arguments on failure.
2. Read Windows event records with one bounded PowerShell `Get-WinEvent` query per source, limited to events since the fixture began and capped per source, from `Microsoft-Windows-Windows Defender/Operational`, `Application` providers `Application Error`, `Windows Error Reporting`, and `.NET Runtime`, and `System` identifiers for service crashes and shutdowns, plus `Get-MpComputerStatus` real-time and behavior-monitoring flags and signature version. Messages are sanitized and bounded. The reader is injectable so tests exercise capture, bounds, redaction, and the non-Windows no-op; a native Windows test exercises the real reader once.
3. Record replacement state for `application` and `update-application`: entries of `node_modules` beginning with a dot or the package scope, the installed manifest version, and the sanitized first part of each public launcher so target or recovery shims are distinguishable.
4. Change nothing in the job environment. Observing antimalware is required before any decision to exclude or disable it, because a true positive there would affect users, not only the smoke.

## Risks and scope boundaries

Windows inventory samples run PowerShell every ten seconds during a long command; each takes one to two seconds on the runner and reads only process metadata. Event queries run only on failure and are bounded to thirty seconds. Evidence remains fixture-scoped, additive, sanitized, and written before cleanup. No assertion, budget, updater, or promotion behavior changes.

## Implementation observations

The runner samples while any command whose budget is at least five minutes runs, every ten seconds by default, one sample in flight at a time, and awaits the in-flight sample before the command result returns. Sampling calls the same selection as settlement with recording disabled, so a reused process identifier seen only by sampling never trips settlement's identity check; the focused test proves close succeeds after such a reuse. `history()` reports sample and error counts, the last error, and per-process first and last sightings keyed by pid and start identity; the smoke writes it as `processHistory` with sanitized executable and arguments, bounded to eighty rows.

Windows records are read by one PowerShell invocation passed as an encoded command (a multi-line `-Command` fails to parse), with the validated ISO window substituted into the script, a thirty-second limit, and base64 output. It queries the Defender operational log, Application providers Application Error, Windows Error Reporting, and .NET Runtime, and System identifiers 7031, 7034, 1074, and 6008, each capped, and `Get-MpComputerStatus` real-time, behavior-monitoring, antivirus, signature, and engine fields. The smoke writes up to one hundred sanitized events with messages bounded to six hundred characters, or the reader error. On other platforms the reader returns no events without executing anything.

Replacement state lists, per prefix, dot-prefixed retired entries under `node_modules`, whether the package scope directory exists, the installed manifest version, and the sanitized leading content or link target of each public launcher.

The reader run on the developer machine reported Defender real-time protection and behavior monitoring disabled there, while the hosted runner image enables both. That is the first concrete environmental difference between the passing local runs and the failing hosted runs.

Local targeted validation: core build, both typechecks, architecture boundaries, full code-documentation policy, strict OpenSpec validation, both focused test files including the native Windows settlement and event-log cases, and one complete local smoke of the staged 0.2.7-dev.1319 pair, which still passes in about seventy seconds.

## Known gaps

The terminator of the detached tree is still unidentified; this change adds the records that name it. The local observation that antimalware is disabled on the developer machine is a lead, not a confirmed cause.
