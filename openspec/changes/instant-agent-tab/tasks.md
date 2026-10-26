# Tasks

## 1. Immediate pending presentation

- [ ] 1.1 Replace the text-bearing starting body with an empty, cursor-free body that respects the configured canvas from either an existing Agent or the landing.
- [ ] 1.2 Keep exactly one selected provisional chip on the first paint and through early registry lists, without hiding pre-existing chips or putting the provisional ID into server requests.

## 2. Safe handoff and failure

- [ ] 2.1 Replace the provisional chip with the real Agent only when its first complete surface commits (or the existing bounded fallback); preserve clean refusal and explicit-switch behavior.
- [x] 2.2 Retain the existing deferred input ownership, single-create gating, and failure recovery without leaking input to the previous Agent.

## 3. Regression coverage

- [ ] 3.1 Add focused assertions for empty pending content, one chip before and after `tab.created` when a registry list arrives early, and a one-frame handoff to the real chip.
- [ ] 3.2 Update the role-level regression for the immediate empty Agent presentation while a holder start slot is occupied and preserved input isolation.

## Evidence

- Prior candidate `d63716ac` passed `npm run build:core`, `npm run typecheck`, focused native machine/attach/landing suites, and the targeted `resident-fixtures,fault-injection` startup-slot role test. Those results describe the superseded text-bearing, duplicate-chip presentation, not the refined candidate.
- Known refinement gap until tasks finish: an early registry list may display both the provisional and real Agent chips; the provisional body displays `Starting Agent…` and footer text. Both are in scope for this refinement.
