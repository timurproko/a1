# In-terminal 2×2 proof gate

The composed-terminal proof is a stop/go gate. AddOne must not merge or productize composed terminal panes until the exact in-terminal spike artifact passes both technical and physical acceptance.

## Go criteria

A `go` decision requires all of the following:

1. Every mandatory workload in the terminal-host evidence schema passes.
2. The proof runs inside an existing terminal without creating a desktop window.
3. The exact artifact is tied to pinned AddOne and terminal-component revisions.
4. Automated evidence came from an isolated worker.
5. The physical verdict is `accepted` through user-controlled manual validation or an attested isolated disposable worker.
6. Input-to-process p95 latency is at most 16 ms.
7. Output-to-present p95 latency is at most 33 ms.
8. Missed frames are zero.
9. Resize paint gaps are zero.
10. No active-workstation terminal automation occurred.
11. The recorded evidence schema validates without contradictory summaries.

## Stop criteria

Any failed, missing, incomplete, contradictory, physically unverified, or threshold-exceeding result is `stop`. A `stop` result:

- forbids production composed-terminal integration;
- forbids milestone merge for composed-terminal work;
- cannot be waived by changing thresholds after evidence collection;
- preserves structured-agent and transparent-mode work as independently usable;
- stops composed-terminal work instead of starting a custom rendering/input remediation loop;
- prevents investment in a postponed desktop-native application shell.

The executable decision is `evaluateNativeSpikeGate` in `src/foundation/native-host-protocol/proof-gate.ts`. The current acceptance record is `openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/terminal-spike-acceptance-record.json`; it remains pending until task 5.6 records a physical verdict for exact artifact bytes.
