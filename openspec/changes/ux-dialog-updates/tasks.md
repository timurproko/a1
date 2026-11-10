## 1. In-place Session Info

- [ ] 1.1 Adapt the bare-A1 Session Info route to the existing replacement-input lifecycle while retaining fresh document snapshots; add shell/composition assertions for no overlay, no feed rows, visible transcript/footer, and unchanged full-screen reference routes.
- [ ] 1.2 Bound the shared report renderer to the input dock and preserve complete sections, long-path wrapping, pinned headings, keyboard/wheel/rail scrolling, and compact resize; add focused rendering and pointer-boundary tests.
- [ ] 1.3 Preserve Escape/interrupt close, prompt focus and retained draft/attachments, late-load cancellation, replacement, and disposal; add lifecycle tests and retain the comparison-profile in-feed assertions.

## 2. Sign-in selector styling

- [ ] 2.1 Apply standard accent-bold Title Case headings without trailing colons to sign-in method and provider selectors; add visible-text and semantic-style assertions for account/API-key routes.
- [ ] 2.2 Apply the shared item-bounded selected background, accent arrow, normal primary text, and muted metadata without selection-induced bold; add focused selected/unselected, narrow-width, and live-theme assertions.
- [ ] 2.3 Retain provider status indicators, search, counters, nested back/cancel, auth outcomes, and comparison-profile presentation; update focused parity/workflow tests to distinguish declared owned styling from preserved behavior.

## 3. Project-trust dialog styling and status layout

- [ ] 3.1 Apply Title Case accent-bold headings and standard item-bounded selected-background styling to startup and in-session trust dialogs; add selected/unselected, compact-width, and startup resource-isolation assertions without changing trust policy or decisions.
- [ ] 3.2 Align Saved decision and Current session values to one left-aligned column and omit the saved-decision parenthesized path suffix; add layout assertions retaining the separate path context and actual resolved decisions.
- [ ] 3.3 Preserve initial saved selection, choice wording, status roles, shortcut adjacency, save/cancel/exit, persistence, terminal restoration, and comparison-profile behavior; retain or extend focused trust and shell tests.

## 4. Pre-ready integration

- [ ] 4.1 Run typecheck, only directly affected test files, and strict validation of this change; reconcile implementation observations and any explicit known-gap dispositions in the design.
- [ ] 4.2 Reconcile and push current origin/develop, prepare the plain Acceptance outcomes, and pass the final delivery-body check before completing the final PR implementation marker.

## Workflow follow-up

- Trusted automation owns readiness and in-branch finalization after implementation completion; required exact-head CI follows.
- Maintainer integration remains a separate explicit choice; no merge is authorized by this plan.
