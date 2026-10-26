# Tasks

## 1. Immediate pending presentation

- [ ] 1.1 Add a local, single-create pending Agent intent on all new-Agent entry paths, with an immediate coherent chip and starting body paint from an existing tab or landing.
- [ ] 1.2 Keep the pending visual state separate from registry and durable tab identity, and make resize, hover, menus, and navigation safe while it is visible.

## 2. Safe handoff and failure

- [ ] 2.1 Reconcile the pending intent with the authoritative created tab and atomically reveal its first complete child frame or bounded fallback.
- [ ] 2.2 Preserve deferred input ownership, single-create gating, and cancellation semantics; restore the previous view and discard pending input on refusal without a ghost tab.

## 3. Regression coverage

- [ ] 3.1 Add deterministic machine and presentation tests for first-event paint, created/failed transitions, burst creation, pointer motion, and no-draw fallback.
- [ ] 3.2 Add a role-level integration regression demonstrating input after click reaches only the new Agent and the visual transition does not depend on holder startup.

## Evidence

Planning only; implementation evidence will be recorded after approval.
