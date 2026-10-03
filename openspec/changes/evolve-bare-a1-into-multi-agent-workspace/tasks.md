> **ON HOLD — USER-CONTROLLED RESUME ONLY.**
>
> `add-persistent-multi-agent-tabs` supersedes the old structured workspace/runtime, ordinary tab, single-pane terminal-host, reconnection, and proof-gate work. The checklist below retains only future split-layout and multiplexer presentation. No unchecked task may begin without fresh refinement and explicit implementation approval after its prerequisites are accepted.

## 1. Historical disposition

- [x] 1.1 Preserve the removed workspace/runtime state in repository history and record that commit `243eb7a7d9031c185c0db13fab880b7f82f75735` has the same tree as the previously documented snapshot `0a70298fe41e8c74f195131dc77d4ccb9b51088c`
- [x] 1.2 Remove the temporary `archive/multi-agent-workspace` remote branch at the user's request after verifying the historical tree remains reachable from repository history
- [x] 1.3 Supersede the structured-agent runtime, semantic workspace, single-pane host, ordinary tab UX, arbitrary CLI-tab, and fixed 2×2 proof-gate plans; retain no executable dependency on their removed source

## 2. Preconditions for any resumed work

- [ ] 2.1 Verify `add-persistent-multi-agent-tabs` is accepted and archived, then inspect its final resident protocol, holders, composer, credentials, writer lease, controller attribution, packaging, rollback, and certification evidence
- [ ] 2.2 If non-A1 commands are required inside panes, verify a separate generic CLI-tab capability is accepted rather than adding command admission implicitly here
- [ ] 2.3 Refine proposal, design, delta, tasks, platform scope, evidence, and migration against the then-current codebase and obtain explicit user approval to implement

## 3. Revisioned split topology

- [ ] 3.1 Add a bounded rooted split-tree model with stable internal-node, pane, holder/session, focused-pane, and topology-revision identities; verify malformed trees, depth/pane limits, ratios, duplicate identities, and missing leaves are rejected
- [ ] 3.2 Add atomic create, split, close, move, resize-ratio, and focus mutations using expected revisions; verify stale and concurrent mutations apply completely or not at all
- [ ] 3.3 Keep one native holder, PTY/process tree, retained model, flow-controlled writer, terminal modes, selection, diagnostics, and recovery state per leaf pane; verify one holder/child failure cannot affect siblings

## 4. Native multiplexer presentation and input

- [ ] 4.1 Extend the attach client to compose the tab strip and every visible pane through the accepted damage-aware native composer with clipping, borders, titles, cursor ownership, synchronized output, and bounded repaint behavior
- [ ] 4.2 Route keyboard, text, paste, focus, mouse, wheel, selection, clipboard, and resize only to the focused pane under the accepted controller revision; verify arbitrary focus/input/controller interleavings cannot cross-route input
- [ ] 4.3 Preserve native-only terminal authority: Node may exchange typed topology/lifecycle/status messages but no PTY bytes, per-event pane input, retained cells, or rendered frames
- [ ] 4.4 Apply per-pane and aggregate tab bounds for pane count, scrollback, queued input, render work, processes, memory, handles, and diagnostics, with visible pane-local failure outcomes

## 5. Recovery, rollback, and evidence

- [ ] 5.1 Reconcile split topology after client or server recovery using accepted holder credentials, native identities, writer lease, epochs, and complete authoritative snapshots without reconstructing screens from logs
- [ ] 5.2 Implement capability-disable rollback that presents surviving pane sessions as ordinary single-pane tabs and never silently terminates or deletes a session
- [ ] 5.3 Add deterministic topology/property tests plus concurrent output, focus/input, resize, malformed stream, blocked writer, pane/holder/server death, cleanup, and parent-terminal restoration suites
- [ ] 5.4 Record exact-package physical or isolated-worker evidence independently for every enabled platform; never automate an active workstation or infer multipane acceptance from single-pane evidence
- [ ] 5.5 Enable split layouts only on platforms whose exact package passes all required evidence, preserve single-pane fallback, synchronize the final delta, and complete ordinary version-3 finalization
