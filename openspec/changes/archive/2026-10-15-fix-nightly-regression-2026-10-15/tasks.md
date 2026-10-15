## 1. Reproduce

- [x] 1.1 Identify the exact failure as the resident-tab hotkeys test expecting the literal `Alt+]` Tabs row while the macOS lane renders `Option+]`, and reproduce the identical assertion on Windows by redefining `process.platform` as `darwin`.
- [x] 1.2 Trace the failure to `ff11eab6`, which added the test with a platform-blind label while the hotkeys presenter deliberately labels Alt as Option on macOS.

## 2. Fix

- [x] 2.1 Make the live-platform assertion expect the modifier the running platform renders, leaving the presenter and every other assertion, budget, timeout, and coverage unchanged.
- [x] 2.2 Add a regression case that renders the Tabs rows under `darwin`, `linux`, and `win32` in turn so every lane proves the macOS labelling rather than only the macOS lane.

## 3. Prove

- [x] 3.1 Record the focused test and typecheck evidence, the green diagnostic Full regression #63 on the fix head, the failed owner and lane, and the known-gap disposition under Evidence in design.md.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
