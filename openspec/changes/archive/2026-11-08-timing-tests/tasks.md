# Tasks

## 1. Concurrent launch test

- [x] 1.1 Rewrite "runs two concurrent launches independently" so it closes one recorded child at a time and asserts that exactly one launch settles with that child's exit code, without assuming which launch reached `spawn` first.

## 2. Teardown

- [x] 2.1 Remove the compaction-progress test's temporary directory with `maxRetries: 10, retryDelay: 100`.
