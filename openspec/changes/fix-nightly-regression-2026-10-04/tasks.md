## 1. Reproduce

- [x] 1.1 Identify the exact Windows Node 22 failure as the prompt-history simultaneous first-open/write/prune test exhausting its unchanged 15-second timeout in the parallel full-validation remainder.
- [x] 1.2 Compare the preceding successful run and suspect range, confirm the test source is unchanged, and record shared-runner contention plus missing resource-sensitive ownership as the cause.

## 2. Fix

- [ ] 2.1 Add the multi-process prompt-history concurrency suite to the authoritative resource-sensitive membership without changing its test body, timeout, workload, assertions, retries, or platform coverage.
- [ ] 2.2 Update governance coverage to pin the membership and prove the full plan excludes the suite from the parallel core and executes it once in the serial resource shard.

## 3. Prove

- [ ] 3.1 Run the focused prompt-history and validation-plan policy suites and inspect the generated full-release partition for exact single ownership.
- [ ] 3.2 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
