## Why

A1 currently models transparent execution as one product-wide exclusive foreground lease, so a stale row or another terminal blocks `a1 pi` and `a1 sandbox`, while bare `a1` follows a different lifecycle and descendant processes can outlive the command that created them. All three interactive forms need one consistent per-invocation ownership model: users can launch any number concurrently, and closing one invocation closes only its complete owned process tree without manual PID or state cleanup.

## What Changes

- Introduce an independent launch-instance lifecycle shared by `a1`, `a1 pi`, and `a1 sandbox`.
- Permit any number and combination of interactive launch instances; remove the product-wide foreground exclusivity constraint and global `busy` launch state.
- Place each invocation and all of its runtime descendants inside one verified, platform-native containment boundary with terminate-tree-on-close behavior.
- Use one terminal-transparent launch guardian for every interactive profile; it inherits terminal handles directly and never reads, parses, relays, or renders terminal traffic.
- Reconcile normal root exit, terminal closure, owner disconnect, crash, and supervisor interruption automatically, recording one outcome per instance while leaving unrelated instances untouched.
- Keep the global supervisor only for plural ownership records, immutable-release/update coordination, and bounded fallback reconciliation; an idle supervisor may remain after all interactive instances close, but no instance-owned UI, Pi, agent, extension, tool, daemon, or descendant may remain.
- Make updates coordinate all verified active launch instances rather than a singular foreground generation.
- Require future resident or detachable agents to use a separately declared explicit capability; default launch instances are non-detachable.
- Replace raw uniqueness/stack-trace failures with typed, concise lifecycle diagnostics when ownership cannot be verified safely.
- **BREAKING**: replace the singular foreground-terminal lease protocol, in-memory model, metadata ownership, and storage uniqueness constraint with plural launch-instance contracts and migrate old live lease rows to terminal historical outcomes rather than treating them as current ownership.

## Capabilities

### New Capabilities

- `launch-instance-lifecycle`: Defines per-command ownership scopes, concurrent instances, containment, close semantics, outcomes, and isolation between instances for all interactive profiles.

### Modified Capabilities

- `agent-supervision`: Replaces one exclusive transparent foreground lease with plural boot-authenticated launch-instance supervision and plural update/reconciliation behavior.
- `launch-profiles`: Makes `a1`, `a1 pi`, and `a1 sandbox` use the same non-detachable instance lifecycle and permits concurrent launches without changing profile roots or terminal semantics.
- `a1-shell`: Places the owned UI and transparent fallback paths under the same launch guardian and close contract while preserving direct terminal ownership.
- `terminal-agent-runtime`: Replaces global lease semantics with per-instance transparent lifecycle registration and cleanup that carries no terminal bytes.

## Impact

This affects bootstrap and immutable launch entry points, runtime selection, transparent launching, owned-UI startup, supervisor protocol and socket ownership, lifecycle domain types, SQLite schema and reconciliation, endpoint metadata, self-update fan-out, process identity inspection, platform process-tree containment, diagnostics, contract/unit/integration tests, and exact-package platform certification. The held `evolve-bare-a1-into-multi-agent-workspace` planning artifacts conflict with the approved non-detachable default and must be reconciled before that held change can resume; this change does not itself resume or implement the held multi-agent scope.
