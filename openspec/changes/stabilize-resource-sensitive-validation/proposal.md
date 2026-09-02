## Why

Development publication has repeatedly failed on Windows Node 24 because process- and filesystem-intensive fast tests contend with the rest of the parallel Vitest remainder and intermittently exceed the generic five-second test timeout. Those failures require a manual rerun even when the exact package and every semantic assertion are valid, so the fast tier needs deterministic resource-aware scheduling rather than retries or broader global timeouts.

## What Changes

- Declare the fast-tier tests whose subprocess, temporary-repository, storage, or release-cohort workloads are sensitive to shared runner contention.
- Exclude those tests from the parallel fast remainder and execute them exactly once in a dedicated non-file-parallel invocation while retaining the existing five-second test timeout.
- Use the same partitioned plan in pull-request and exact-package validation on every platform, while retaining all assertions and failing on any real assertion failure, process error, or timeout.
- Emit distinct plan, subprocess/fixture timing, and outcome evidence for the ordinary remainder and resource-sensitive partition so omissions, duplicates, contention, and failures are auditable.
- Require repeated isolated passes under the existing timeout and optimize fixture or subprocess work if a test remains slow; this change SHALL NOT increase a test, suite, platform, or workflow timeout.
- Add governance and regression coverage proving complete fast-tier ownership, single execution, bounded serialization, unchanged timeout policy, and the absence of arbitrary automatic test retries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Require resource-sensitive fast tests to run once under deterministic bounded isolation instead of competing in the parallel remainder.
- `isolated-regression-testing`: Define fail-closed resource isolation for process- and filesystem-intensive tests without retrying semantic failures.

## Impact

Affected surfaces include `config/validation-suites.json`, the validation-tier planner and runner, focused repository-governance tests, and development/release validation evidence. Product runtime behavior, exact package bytes, publication prerequisites, npm tags, supported Node versions, and the one-pack/one-upload artifact boundary remain unchanged.
