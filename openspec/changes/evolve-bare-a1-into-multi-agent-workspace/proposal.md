> **ON HOLD — USER-CONTROLLED RESUME ONLY.**
>
> This historical change ID now retains only future split-layout and multiplexer presentation work. The user must explicitly approve a new refinement and implementation request after persistent resident tabs and any required generic CLI-tab capability are accepted.
>
> **Historical source.** The removed structured workspace/runtime source remains recoverable from repository commit `243eb7a7d9031c185c0db13fab880b7f82f75735`, whose tree matches the previously documented snapshot `0a70298fe41e8c74f195131dc77d4ccb9b51088c`. The temporary `archive/multi-agent-workspace` remote branch was deleted at the user's request on 2026-09-25. Historical source is evidence only and SHALL NOT be restored wholesale.
>
> **Superseded scope.** `add-persistent-multi-agent-tabs` replaces this change's semantic structured-agent workspace, structured runtime, single-pane terminal-host, reconnection, ordinary tab UX, and single-pane certification plans. Arbitrary CLI tabs require their own follow-up. Only split trees, pane focus, multiplexer presentation, and split-specific certification remain here.

## Why

Persistent terminal-session tabs provide the multi-agent product and native extension path without the archived structured-worker architecture. A later product may still need several independently retained terminal sessions visible inside one tab, but that split-layout surface should extend the accepted resident host instead of reviving the deleted workspace or the disposable fixed 2×2 proof.

## What Changes

- Add revisioned split-tree topology inside an accepted resident tab, with one holder-owned terminal session per leaf pane.
- Keep terminal bytes, retained models, input encoding, selection, clipboard, query responses, and final composition in the native terminal host.
- Add pane focus, resize, create, close, and layout mutations with expected revisions and exact per-pane ownership.
- Generalize the accepted tab strip into multiplexer presentation without changing the tab bridge or inventing structured semantics from terminal output.
- Require split-specific resource bounds, failure isolation, rendering/input evidence, and exact-package platform certification before any enablement.
- Preserve a single-pane resident tab as the fallback and rollback path.

## Capabilities

### New Capabilities

- `resident-tab-splits`: held future requirements for revisioned split trees, pane/session ownership, native composition and input focus, isolation, bounds, rollback, and certification on top of the accepted resident terminal host.

## Impact

- **Prerequisites:** accepted persistent resident tabs; an accepted generic CLI-tab change if non-A1 commands are in scope; fresh review against the then-current terminal-host protocol and packaging.
- **Native:** future topology and composition changes only. The old structured runtime, control-store tables, Node workspace, and fixed proof presentation are not dependencies.
- **Node:** semantic control messages may request layout mutations, but Node never receives terminal bytes, per-key pane input, or rendered cells.
- **Release:** no code, preview, default change, or support claim is authorized by this held plan.
- **Rollback:** disable split layouts and present each resident session as an ordinary single-pane tab without deleting its session record.
