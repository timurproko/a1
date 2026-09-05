## 1. Pointer tracking and current-frame hover

- [x] 1.1 Update controller-owned pointer tracking for decoded motion, wheel, press, and release reports while retaining coordinates through control hiding and clearing them through existing reset/teardown paths; verify focused controller or shell tests cover each report kind and unknown/reset positions without changing event ownership.
- [x] 1.2 Pass the pointer snapshot into viewport composition and derive bottom-control hover from the same current rectangle used for hit metadata before painting; verify a distinguishing test theme reports correct inside, boundary, outside, and unknown states on the first composed frame without a second composition.
- [x] 1.3 Integrate pointer-dependent presentation invalidation with existing render reuse and preserve hyperlink cleanup, scrollbar/sticky behavior, selection, and editor/modal routing; verify focused existing interaction/reuse tests and assertions that this hover fix introduces no unconditional follow-up or forced full-screen renders.

## 2. Regression coverage

- [x] 2.1 Add shell regression tests for repeated scroll-to-end hide and scroll-away reveal under a stationary cursor, first-wheel coordinates without prior motion, keyboard-driven reveal, and pointer updates outside the control while hidden; verify the first returned frame's actual hover styling without injecting corrective mouse motion.
- [x] 2.2 Add component/shell geometry regressions for terminal resize, dock allocation, and new-message label width changes that move the hit region under or away from a stationary pointer; verify styling and click targets use the current rectangle, including normal presentation when the control cannot be displayed.
- [x] 2.3 Preserve activation and lifecycle behavior with tests for click-to-follow and hide, wheel scrolling without activation, outside-region clicks, content fitting, and pointer/session reset; verify no stale hover survives reset and the pinned comparison path remains unchanged.

## 3. Integration and acceptance

- [ ] 3.1 Submit the implementation in its separate code pull request citing this accepted specification and verify required CI checks pass, including focused viewport/shell regressions; record check results without treating automated results as physical-terminal acceptance.
- [ ] 3.2 Provide the exact built candidate and build-first `./scripts/dev` handoff, and obtain user confirmation that repeated stationary-cursor hide/show cycles hover immediately while moving outside removes hover and click-to-bottom still works; record the candidate commit, terminal geometry, and acceptance result before requesting authorization to merge.
