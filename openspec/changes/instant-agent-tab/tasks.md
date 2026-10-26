# Tasks

## 1. Immediate pending presentation

- [x] 1.1 Add a local, single-create pending Agent intent on all new-Agent entry paths, with an immediate coherent chip and starting body paint from an existing tab or landing.
- [x] 1.2 Keep the pending visual state separate from registry and durable tab identity, and make resize, hover, menus, and navigation safe while it is visible.

## 2. Safe handoff and failure

- [x] 2.1 Reconcile the pending intent with the authoritative created tab and atomically reveal its first complete child frame or bounded fallback.
- [x] 2.2 Preserve deferred input ownership, single-create gating, and cancellation semantics; restore the previous view and discard pending input on refusal without a ghost tab.

## 3. Regression coverage

- [x] 3.1 Add deterministic machine and presentation tests for first-event paint, created/failed transitions, burst creation, pointer motion, and no-draw fallback.
- [x] 3.2 Add a role-level integration regression demonstrating input after click reaches only the new Agent and the visual transition does not depend on holder startup.

## Evidence

- `npm run build:core` and `npm run typecheck` passed after installing locked dependencies in the owning worktree.
- Native focused library suites passed: `core::attach::machine::tests` (35), `roles::attach::tests` (43), `roles::landing::tests` (8), and `first_draw` (1), linked against the locally copied, manifest-verified terminal-vt artifact.
- The `resident-fixtures,fault-injection` role integration `input_waits_for_its_requested_tab_while_that_tab_waits_for_a_start_slot` passed, including immediate starting presentation before the holder gets a slot and isolated deferred input.
- `TERMINAL_HOST_CONTRACTS_ONLY=1 TERMINAL_HOST_LOCAL_BUILD=1 cargo check --tests` passed; `openspec validate instant-agent-tab --strict` and `git diff --check` passed.
- Known gaps: none in the scoped implementation. Local native tests require a verified VT library because Zig is not installed; CI will run the native lane on the final head.
