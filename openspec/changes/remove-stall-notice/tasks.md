# Tasks

## 1. Session shell

- [ ] 1.1 Remove the stall timer, the `stalled` report, and the `No progress` transcript line from `ResidentTabCoordinator.observeProgress`, keeping `idle` reporting on lifecycle settlement.
- [ ] 1.2 Remove `stallNoticeSeconds` from the resident options, launch settings, and composition root, and `stalled` from `ResidentTabStatus` and `reportStatus`.
- [ ] 1.3 Update the coordinator, recovery, and resident-tab tests: a long busy turn reports no `stalled` status and appends no workflow status.

## 2. Resident server

- [ ] 2.1 Remove `stalled` from the accepted bridge states, `Lifecycle`, and the counters.
- [ ] 2.2 Make `child-unresponsive` and `child-responsive` update only the registry lifecycle and counters, without rewriting or pushing the presented surface status; keep the automatic restart.
- [ ] 2.3 Update native server tests for both notices and the counter set.

## 3. Attach client

- [ ] 3.1 Remove the stalled/unresponsive notice row, the bare `R` restart arm, and `unresponsive`/`stalled` from the strip's `!` glyph and amber colour, keeping the failed-tab banner and `degraded`.
- [ ] 3.2 Update attach, strip, and simulator tests: `R` on such a tab is typed, no notice row is rendered, and the chip shows no `!`.

## 4. Documentation

- [ ] 4.1 Update `docs/architecture/resident-tabs.md` for the removed stall notice and the silent unresponsive restart.
