# Windows 2×2 native-host proof gate

The native composed-terminal proof is a stop/go gate. AddOne must not merge or productize composed terminal panes until the exact spike artifact passes both technical and physical acceptance.

## Go criteria

A `go` decision requires all of the following:

1. Every mandatory workload in `addone-native-host-spike-evidence-v1` passes.
2. The exact artifact is tied to pinned AddOne, Winghostty, and Ghostty commits.
3. Automated evidence came from an isolated worker.
4. The physical verdict is `accepted` through user-controlled manual validation or an attested isolated disposable worker.
5. Input-to-process p95 latency is at most 16 ms.
6. Output-to-present p95 latency is at most 33 ms.
7. Missed frames are zero.
8. Resize paint gaps are zero.
9. No active-workstation terminal automation occurred.
10. The recorded evidence schema validates without contradictory summaries.

## Stop criteria

Any failed, missing, incomplete, contradictory, physically unverified, or threshold-exceeding result is `stop`. A `stop` result:

- forbids production composed-terminal integration;
- forbids milestone merge for composed-terminal work;
- cannot be waived by changing thresholds after evidence collection;
- preserves structured-agent and transparent-mode work as independently usable;
- requires redesign or correction and a new exact-artifact proof.

The executable decision is `evaluateNativeSpikeGate` in `src/foundation/native-host-protocol/proof-gate.ts`. The current acceptance record is `openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/native-spike-acceptance-record.json`; it remains pending until task 5.6 records a physical verdict for exact artifact bytes.
