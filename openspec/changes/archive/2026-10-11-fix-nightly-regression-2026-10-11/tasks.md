## 1. Reproduce

- [x] 1.1 Confirm the exact hosted failure and attempt repeated focused reproduction on Windows Node 24, recording that five local runs pass without the hosted resource pressure.
- [x] 1.2 Trace the environmental coupling to the fixed readiness sleep introduced by `bba1b572`, outside the suspect range; no suspect commit changed the helper path or test.

## 2. Fix

- [x] 2.1 Observe the helper's protocol readiness before measuring the warm path, preserving the 500-millisecond assertion, 15-second timeout, real child process, and cold-spare coverage.
- [x] 2.2 Retain the warm-spare test as regression evidence for readiness, request execution, and replenishment without a fixed-sleep precondition.

## 3. Prove

- [x] 3.1 Record focused implementation evidence, pre-finalization PR Full regression observations, failed owners and lanes, and known-gap disposition under Evidence in design.md.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
