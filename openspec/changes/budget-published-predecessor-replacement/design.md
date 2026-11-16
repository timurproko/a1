## Evidence and boundary

Failed publication: https://github.com/timurproko/a1/actions/runs/43860507966, source 74fd89ed496e40947c30fd5a6bffb14eb8ef07fc, version 0.2.7-dev.1328. Its Windows smoke artifact records fresh installation 146738 ms, predecessor installation 153007 ms, and update failure 120005 ms. The attempted predecessor is 0.2.7-dev.1327, not the older defective 1307 worker. The crash observation is null; inventory includes the CLI, recovery worker, npm bridge, and real npm. The worker owner heartbeat is dated 12:05:54.857Z, after the update deadline at approximately 12:05:52Z. The candidate manifest exists in the replacement prefix, but no launchers exist. npm's last retained log record is at 12:04:17.830Z with no exit result. A live process and heartbeat do not establish npm progress or eventual success.

The prior successful 1327 publication (run 43848101865) exercised 1307 through authenticated installer recovery: direct update failed after 10607 ms and recovery installation took 135434 ms. It does not establish that direct replacement by 1327 fits the two-minute deadline.

Read-only registry inspection found both 1328 packages with integrities matching the failed run, both a1-staging tags on 1328, and both next tags on 1327. No registry mutation or workflow dispatch was performed. Downloaded evidence is ignored scratch under this worktree's .artifacts/investigation/.

## Decision

Change only the update command allowance from two to five minutes on every platform. This operation performs real npm replacement, so the existing installation budget is a reasonable bounded allowance. Keep the exported update budget accessor and its callers intact in shape. Do not infer success from a heartbeat, package files, or process liveness; the real command must succeed and existing exact-package and launcher checks must still run.

Acquisition remains two minutes; metadata/launches and settlement remain thirty seconds. The longest sequential compatibility path becomes twenty-two minutes of acquisition/install/update/recovery allowances, versus nineteen before this change. Existing twenty-five-minute exercise and thirty-minute job limits retain headroom for short queries, launches, bounded diagnostics and settlement. They remain emergency limits, not guarantees that every stage can consume its maximum.

## Focused coverage

Update the stage budget and progress contracts, including recovery tests that distinguish update from installation. Simulate a successful update beyond 120 seconds but below 300 seconds and require exact manifest and final launcher assertions. Exercise failure at the new update deadline, preserving sanitized evidence, process settlement, and blocked generic-timeout recovery. Keep existing process ownership, crash authentication, and promotion assertions unchanged.

## Risks and non-goals

A real stall can now take five minutes to report. This proposal does not identify why npm spent time extracting/replacing files, nor prove the interrupted attempt would finish. Hosted native publication remains separate evidence after approved implementation and integration. Do not publish, promote, retry the failed workflow, alter predecessor bytes, bypass the updater, or treat a generic timeout as permission for repair.

## Approval and known gaps

Planning only; implementation has not been authorized. The deadline change explicitly revises the previously approved two-minute update policy. A live successful replacement on the new allowance is not yet established.
