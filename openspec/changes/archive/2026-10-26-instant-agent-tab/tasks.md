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

## 4. Plain immediate Agent shell refinement

- [x] 4.1 Render an empty transcript with a visible ruled prompt and cwd footer on the first client-side create paint, using the existing canvas/palette; omit startup messages, unknown status, and the child cursor.
- [x] 4.2 Keep the single-chip, deferred-input, and first-complete-frame handoff semantics with the shell preview from both landing and existing-tab origins, including small terminals.
- [x] 4.3 Add focused native rendering and role-level assertions for the plain shell preview and its replacement with the real frame; run typecheck, strict OpenSpec validation, and touched native tests.

## 5. Complete idle Agent shell refinement

- [x] 5.1 Draw a visual inverse-space caret in the empty prompt and a second footer row on the same immediate pending-tab frame, without turning on the child cursor.
- [x] 5.2 Extract display-only model/context hints from the last complete Agent frame, reset new-tab usage/cost, and supply neutral values when no frame exists; replace all hints on the first authoritative new-Agent frame.
- [x] 5.3 Cover cached and uncached previews, narrow geometry and the startup-slot input handoff in focused native tests; run typecheck, strict OpenSpec validation, and touched tests.

## Evidence

- Prior candidate `d63716ac` passed `npm run build:core`, `npm run typecheck`, focused native machine/attach/landing suites, and the targeted `resident-fixtures,fault-injection` startup-slot role test. Those results describe the superseded text-bearing, duplicate-chip presentation, not the refined candidate.
- Refined implementation uses one local provisional chip and an empty, cursor-free body. A snapshot of pre-click tab IDs hides any newly registered Agent chip before and after `tab.created`; the real chip appears only on complete-surface commit.
- `npm run typecheck`, `openspec validate instant-agent-tab --strict`, and `git diff --check` passed for the refinement.
- Focused native suites passed: `core::attach::machine::tests` (35), `roles::attach::tests` (44), `roles::landing::tests` (8), and `first_draw` (1); `TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed with the locally copied manifest-verified terminal-vt library.
- The `resident-fixtures,fault-injection` role integration `input_waits_for_its_requested_tab_while_that_tab_waits_for_a_start_slot` passed, including an empty pending body before holder startup and deferred input isolation.
- The shell refinement paints a blank transcript, three-row editor (rules and an empty, cursor-free input row), and cwd footer on the same pending-chip paint. No model, counters, version, or startup text is fabricated; the existing first-complete-frame and deferred-input paths remain unchanged.
- The preview's 8-row landing/attach native tests and 44 attach native tests passed. The `resident-fixtures,fault-injection` startup-slot role regression passed with a ruled editor and cwd visible before the holder started, no loading text/cursor, and no old-tab input leakage. `npm run typecheck`, `openspec validate instant-agent-tab --strict`, and `git diff --check` passed. `cargo fmt --check` reports pre-existing formatting differences in numerous unrelated files, so no repository-wide format rewrite was applied.
- The prior ruled-editor/cwd-only preview lacked the caret and model/usage row shown in the maintainer's screenshot. This refinement draws both immediately; the last complete Agent's context/model/subscription/thinking style is reused for display, but usage is zeroed. The child's first complete frame replaces all provisional values. Without a prior complete Agent footer (e.g. a cold landing), the preview instead shows neutral `no-model` and `0.0%/0 (auto)`; it does not claim an unobserved model.
- `npm run typecheck`, strict OpenSpec validation, `git diff --check`, landing native tests (8), attach native tests (45), and the `resident-fixtures,fault-injection` startup-slot role integration passed. The role fixture confirms the complete idle footer and non-interactive caret appear before holder startup while deferred input remains isolated.
- Known gaps: an uncached cold start cannot show the actual model/context before that Agent reports it; the neutral fallback occupies the full footer row. Interactive visual validation remains optional and final-head CI is authoritative. Native tests use the manifest-verified terminal-vt library because Zig is unavailable.
