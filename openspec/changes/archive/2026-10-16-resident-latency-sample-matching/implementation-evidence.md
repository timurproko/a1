# Implementation evidence

## Diagnosis

- PR #776 run `38791920231`, job `Native terminal host (macOS arm64)`, failed only in the resident latency step: `resident latency budgets exceeded: inputToProcessMs=94.859916ms>16ms`. Build, Rust and vitest suites, probes, and release-artifact checks passed.
- Its `performance-darwin-arm64.json` recorded 23 input samples. The cold first input took 94.9 ms. Ten samples were negative, between -0.7 ms and -13.6 ms, for tokens `b`, `d`, `e`, `m`, `n`, `o`, `p`, `r`, `s`, and `t`, which are the letters of the `a1;standby-promote` marker. The other samples took 0.1 ms to 0.6 ms.
- The previous green macOS run on the same branch, `38783656121`, recorded the same ten negative tokens. Its p95 was its cold input, 15.2 ms against the 16 ms budget.
- Between the green head `0f6f3839` and the failing head `2702bc18`, the only code changes were #779's footer TypeScript. Neither the fixture nor the terminal host's input path changed.

## Local focused evidence

On Windows Node 24:

- `npx vitest run test/repository-governance/resident-tab-measurements.test.ts`: 1 file, 4 tests passed. The tests cover the following: a stale `measurement:s:1000` line is skipped for a send stamped at 1999 and the later `2000` line is matched; a token with only a stale line returns no match; 23 samples with one 94.9 ms cold outlier give p95 0.5 ms and pass; one negative sample fails input-to-process with `rejectedSamples: 1` while output-to-present still passes; and cold-launch and warm-creation metrics recorded only on the first sample are not rejected.
- Replaying both recorded macOS sample sets through the new summary fails input-to-process with `rejectedSamples: 10`, instead of passing or failing on the cold sample.

## Gaps

- The true latencies of the ten stale inputs were never recorded, so the replay cannot show the corrected p95. The first CI run of this harness on macOS arm64 is the first valid measurement. The native host is not built locally because endpoint protection quarantines its build.
