# Design

## How the empty clipboard write happened

`startHelper` in the copy transport keeps the prepared text in `prepared` and its byte count in `preparedBytes`. When the helper's `result` message arrives before its exit, a 250 ms timer bounds a helper that never exits by calling `cancel`, which empties `prepared`, kills the child, and leaves `outcome` and `preparedBytes` as they were. `settle` then runs on exit, sees a delivered outcome whose `expectedBytes` still equals `preparedBytes`, and resolves with `text: ""`. The executor's abort signal was never raised on this path, so it reports `submitting` and calls the injected writer with the empty string. On an unloaded machine the helper exits within a few milliseconds of its result; under starvation, where the child's exit competes with the parent's event loop, 250 ms is routinely exceeded, which is why the failure appeared on the shared Windows runner and reproduced locally with the test pinned to two cores under load.

## Reap versus cancel

The two callers of `cancel` want different things. Protocol violations, oversized payloads, and the owner's abort must discard everything, because the result is untrusted or unwanted. The post-result timer only needs the process gone; the result it bounds is already complete and verified by the byte count. `stop(discard)` keeps one termination path and lets the timer call `reap`, which terminates the child without touching `prepared`. `settle` is unchanged, so a helper that reports a result and then sends more data, or that reports an incomplete byte count, still fails as `transport`.

## The fixture warm-up

`local-cleanup.node.mjs` runs its two Windows handle tests last, about a minute into the file. The hosted runner's first `powershell.exe` launch pays assembly loading, JIT, and first-run scanning, and the job's earlier steps use bash, so nothing had warmed the interpreter. A throwaway `powershell.exe -Command "exit 0"` spawned when the file loads overlaps that cost with the earlier tests; `hold` and the probe await it so the fixture's 10 s bound measures a warm launch. The bound itself, the file-sentinel release protocol, and the assertions do not change, which keeps the change inside the resource-sensitive partition's rule that a slow test is optimized rather than given a larger allowance.

## What is unchanged

The coordinator's 5,000 ms admission deadline still expires a helper that has not reported a result, the 250 ms grace still bounds a lingering helper's lifetime, and the partition's 30 s hang bound still applies to every test in the class. The baseline test's own 5 s wait is the production deadline and stays as it is.
