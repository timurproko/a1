## Context

> **Status: ON HOLD by user direction.** This document preserves only future split-layout and multiplexer presentation intent. It grants no implementation, publication, certification, or merge authority.

The original change combined a semantic structured-agent workspace with a native composed-terminal system. That architecture was implemented only as dormant contracts/proofs, then removed because no product entry point reached it. The current resident-tab plan chooses a simpler product boundary: each agent is a complete A1 terminal session owned by a native holder.

`add-persistent-multi-agent-tabs` therefore supersedes all ordinary tab, structured runtime, single-pane host, reattachment, and single-pane certification scope from this change. The historical source remains in repository history at `243eb7a7d9031c185c0db13fab880b7f82f75735`; the temporary archive remote branch has been removed. Restoring that tree would reintroduce obsolete contracts and control-store ownership and is not a migration strategy.

The only retained question is how an accepted resident tab may later contain a revisioned split tree of independently retained terminal sessions.

## Goals / Non-Goals

**Goals:**

- Extend the accepted native resident host with split-tree topology inside a tab.
- Give each leaf pane one exact holder, pseudoterminal, process tree, retained terminal model, dimensions, selection, and diagnostics identity.
- Keep terminal bytes, query responses, input encoding, rendering, and final composition native-only.
- Apply focus, resize, create, close, and layout changes atomically against expected topology revisions.
- Preserve per-pane isolation and bounded behavior under noisy output, malformed streams, blocked input, child failure, and holder failure.
- Keep ordinary single-pane resident tabs as the rollback and capability-disabled path.
- Require exact-package evidence for simultaneous panes rather than inferring it from single-pane acceptance.

**Non-Goals:**

- Restoring the removed structured-agent runtime, Node workspace domain, old control-store tables, or archived tests.
- Replacing the resident tab strip or tab bridge.
- Defining arbitrary CLI-tab creation; that needs a separate change before non-A1 pane commands can be admitted.
- Treating the historical fixed 2×2 proof as product code or accepted evidence for the future implementation.
- Desktop-native windows, remote attachment, multi-user sharing, or terminal-byte relay through Node.
- Any implementation before explicit user resumption and fresh planning against then-current resident-host interfaces.

## Decisions

### 1. Resident tabs are the prerequisite and authority boundary

A split layout is an optional topology inside one accepted resident tab. The resident server remains authoritative for durable tab identity and clients; native pane topology is added to that protocol rather than layered through the deleted semantic workspace.

The implementation SHALL begin only after `add-persistent-multi-agent-tabs` is accepted and archived. If generic CLI commands are required, their separately accepted tab-kind and command-admission policy SHALL also precede split implementation.

### 2. A split tree is revisioned and atomic

Each split tab owns a rooted tree:

- internal nodes declare horizontal or vertical axis and a bounded ratio;
- leaf nodes reference one stable pane identity;
- each pane references one resident holder/session identity;
- one pane is focused per client view, while the server retains the authoritative topology revision.

A mutation supplies the expected revision and complete intent. The host either commits one newer valid tree or rejects without partial effects. Node may request semantic mutations but never mirrors a second live topology authority.

### 3. Every leaf remains a process failure domain

One holder continues to own one pseudoterminal, child tree, libghostty-vt model, flow-controlled writer, retained screen, journal/lease policy where applicable, and diagnostics. A split tab does not move several PTYs into one holder. Holder or child failure replaces only that leaf and leaves sibling panes interactive.

The resident server may fail and recover without killing pane holders, under the accepted writer-lease, credential, identity, and epoch rules. Split work SHALL NOT weaken those guarantees.

### 4. Native code owns composition and input arbitration

The attach client composes the strip and split surfaces into the outer terminal. The native host owns:

- pane rectangles and clipping;
- focused-pane keyboard, text, paste, focus, mouse, and wheel routing;
- pane-relative mouse coordinates;
- per-pane selection and clipboard transfer;
- synchronized/damage-aware painting and cursor placement; and
- terminal restoration after normal or fatal detach.

Node receives typed topology/lifecycle/status messages only. It never receives PTY bytes, individual pane input, retained cells, or final frames.

### 5. Client focus and input ownership remain explicit

Each client may view and focus a different pane, but the accepted per-session input-controller rule still applies. A pane's holder accepts input and size only from its current controller revision. Focus changes and input acceptance share one native ordering domain so a key cannot cross from one pane to another during a race.

### 6. Resource policy is pane- and tab-bounded

Every pane has declared scrollback, queued-input, render, process, and diagnostics bounds. A split tab also has a maximum pane count and aggregate memory/handle budget. Hidden tabs remain unpainted but parsed according to the accepted resident policy. Exceeding one pane's bound yields a visible pane-local outcome and cannot block siblings or the server.

### 7. Split support earns separate certification

Single-pane acceptance proves neither simultaneous rendering nor focus safety. A future implementation must provide deterministic topology properties, concurrent high-rate output, rapid focus/input changes, resize and terminal-size changes, Unicode, paste, mouse, selection/clipboard, alternate-screen applications, blocked writers, malformed output, pane/holder/server death, cleanup, and parent-terminal restoration.

Physical or isolated-worker evidence must use exact packaged bytes on each enabled platform. Nothing may automate an active workstation, and no platform inherits another platform's verdict.

### 8. Rollback preserves sessions

Disabling split layouts flattens presentation into ordinary single-pane tabs without deleting session records. If several panes exist, the UI must require an explicit choice of which sessions remain running as tabs; rollback may not silently terminate or discard them.

## Risks / Trade-offs

- **Composition complexity:** simultaneous surfaces add clipping, cursor, mode, and damage interactions. Reuse the accepted native composer and gate the feature on multipane paint evidence.
- **Input races:** focus and controller transfer can cross-route input. Keep them in one native ordering domain and test arbitrary interleavings.
- **Resource multiplication:** each pane owns a holder and A1/CLI process. Enforce pane-count and aggregate limits before creation.
- **Protocol drift:** the resident protocol may evolve before this hold is lifted. Refine deltas against the accepted generation rather than preserving today’s message shapes.
- **Historical-code temptation:** the removed source contains useful lessons but obsolete ownership. Read selectively; do not restore modules wholesale.

## Future Migration Sequence

1. Verify persistent resident tabs are accepted and inspect the then-current protocol, holder, composer, credentials, writer lease, packaging, and certification records.
2. If non-A1 commands are required, complete and accept a separate generic CLI-tab capability first.
3. Refine this held plan and obtain explicit implementation approval.
4. Add revisioned split topology and one-holder-per-leaf behavior behind a disabled capability.
5. Add native composition, focus/input arbitration, resource bounds, recovery, and deterministic tests.
6. Record exact-package platform evidence before enablement.
7. Keep single-pane tabs as rollback and archive this change only with the accepted split implementation.
