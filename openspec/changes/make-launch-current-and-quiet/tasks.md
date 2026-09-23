## 1. Make ordinary release selection monotonic

- [ ] 1.1 Add semantic release-selection policy for ordinary launch so a newer verified active release beats an older invoked installation and a newer verified installed candidate beats an older active release; verify focused selection tests cover newer, older, equal, unapproved, and incompatible candidates.
- [ ] 1.2 Activate a selected newer candidate before establishing or reusing its cohort endpoint without releasing other cohorts; verify a live older launch instance continues unchanged while the new instance starts on the candidate.
- [ ] 1.3 Preserve explicit update target authority independently of ordinary launch ordering; verify an intentional exact-preview downgrade still activates its selected target and later ordinary launch follows it.

## 2. Close the activation-to-admission race

- [ ] 2.1 Add a machine-readable superseded-cohort command result and make supervisor admission freshly read the active reference before refusing a new instance; verify stale cached role state accepts after reactivation while a truly superseded cohort still rejects new ownership and keeps existing instances.
- [ ] 2.2 Add one bounded silent guardian/bootstrap reselection for the dedicated superseded result, preserving profile, cwd, environment, and explicit session arguments; verify successful reselection prints no internal diagnostic and a repeated handoff produces one concise terminal failure without looping.
- [ ] 2.3 Add concurrent independent-process coverage in which activation changes between selection and admission; verify every admitted new launch uses an eligible active cohort and unrelated retained instances remain live.

## 3. Keep internal SQLite stability notices off the terminal

- [ ] 3.1 Remove the control store and `node:sqlite` from terminal-attached startup import graphs by using narrow lifecycle imports and captured SQLite owners; verify module-graph tests cover CLI, guardian, and UI startup boundaries.
- [ ] 3.2 Add a supported-Node startup fixture that emits the SQLite experimental-stability notice at its owned boundary; verify successful launch stderr excludes that notice while an unrelated Node warning remains observable.

## 4. Prove packaged behavior and governance

- [ ] 4.1 Add an exact-package lifecycle scenario with a working old-release session, successful newer activation, and immediate new launch; verify the old session remains usable, the new session uses the newer release, and no release-coordination message, reboot, session closure, process discovery, or state deletion is required.
- [ ] 4.2 Run focused release, supervision, guardian, package-startup, update, module-boundary, typecheck, architecture, documentation, and strict OpenSpec validation; record implementation evidence and disposition every observed gap before finalization.
