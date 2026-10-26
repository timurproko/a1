# Tasks

## 1. Immediate pending presentation

- [x] 1.1 Replace the text-bearing starting body with an empty, cursor-free body that respects the configured canvas from either an existing Agent or the landing.
- [x] 1.2 Keep exactly one selected provisional chip on the first paint and through early registry lists, without hiding pre-existing chips or putting the provisional ID into server requests.

## 2. Safe handoff and failure

- [x] 2.1 Replace the provisional chip with the real Agent only when its first complete surface commits (or the existing bounded fallback); preserve clean refusal and explicit-switch behavior.
- [x] 2.2 Retain the existing deferred input ownership, single-create gating, and failure recovery without leaking input to the previous Agent.

## 3. Regression coverage

- [x] 3.1 Add focused assertions for empty pending content, one chip before and after `tab.created` when a registry list arrives early, and a one-frame handoff to the real chip.
- [x] 3.2 Update the role-level regression for the immediate empty Agent presentation while a holder start slot is occupied and preserved input isolation.

## Evidence

- Prior candidate `d63716ac` passed `npm run build:core`, `npm run typecheck`, focused native machine/attach/landing suites, and the targeted `resident-fixtures,fault-injection` startup-slot role test. Those results describe the superseded text-bearing, duplicate-chip presentation, not the refined candidate.
- Refined implementation uses one local provisional chip and an empty, cursor-free body. A snapshot of pre-click tab IDs hides any newly registered Agent chip before and after `tab.created`; the real chip appears only on complete-surface commit.
- `npm run typecheck`, `openspec validate instant-agent-tab --strict`, and `git diff --check` passed for the refinement.
- Focused native suites passed: `core::attach::machine::tests` (35), `roles::attach::tests` (44), `roles::landing::tests` (8), and `first_draw` (1); `TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed with the locally copied manifest-verified terminal-vt library.
- The `resident-fixtures,fault-injection` role integration `input_waits_for_its_requested_tab_while_that_tab_waits_for_a_start_slot` passed, including an empty pending body before holder startup and deferred input isolation.
- Known gaps: none in the approved refinement. Local native tests use the manifest-verified terminal-vt library because Zig is unavailable; final-head CI is the validation authority.
