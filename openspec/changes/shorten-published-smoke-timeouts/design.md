## Context

Run 43828121742 checks out cf8884d, whose Windows predecessor-update budget is twenty minutes. Current develop uses five minutes. The approved proposal chooses two-minute installation/update command budgets, an eight-minute emergency smoke-step limit, and a ten-minute job limit. Command deadlines normally preserve time for evidence and cleanup; outer deadlines are hard backstops, not a guarantee every stage can consume its maximum consecutively.

## Decisions

- Use two minutes for each installer acquisition, application installation, predecessor installation/update, and authenticated recovery command. Keep metadata queries and public launches at thirty seconds, and preserve thirty-second process settlement.
- Set only the Published pair job to ten minutes and its exercise step to eight minutes. Keep the upload step conditional on always(), and keep promotion dependent on successful native smoke lanes.
- Print the phase and budget before each command, a phase/elapsed/budget heartbeat every thirty seconds, and outcome/duration afterward. Clear the heartbeat on either result or exception so it cannot outlive its command or leak child output.
- Lower the process-sampling eligibility threshold to two minutes while retaining the ten-second sample interval and existing ownership, sanitization, and identity protections.
- Persist the sanitized failure snapshot after collection and before process settlement/removal, then write the final record again after cleanup to include secondary errors. A checkpoint write failure must not mask the primary stage error; the final write remains authoritative and reports unavailable evidence.
- Retain the existing authenticated legacy-owner crash detection and strict recovery eligibility. Timeouts and unknown failures never qualify for installer recovery, and no smoke failure permits promotion.

## Risks

Two-minute commands may expose slow but healthy hosted Windows installs as failures; this is an explicitly approved initial budget, not proof of a fix for the Windows updater. Outer hard timeouts can interrupt cleanup or diagnostics; the pre-cleanup checkpoint improves retained evidence but cannot guarantee evidence after abrupt runner termination. No retry or weakened assertions are added.

## Known gaps

The underlying hosted Windows update failure is not repaired by shortening deadlines. Hosted timings and exact-candidate CI remain external validation; focused local tests cover budgets, progress, snapshot ordering, process sampling, legacy recovery, and promotion gates.
