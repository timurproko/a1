## 1. Restore observer lifecycle

- [x] 1.1 Centralize current-session compaction observer attachment and use it for initial binding and same-session resume.
- [x] 1.2 Preserve exact stream-function restoration across suspension, replacement, repeated resume, and disposal without nested wrappers or stale callbacks.

## 2. Prove visible progress survives resume

- [x] 2.1 Extend runtime lifecycle coverage with a callable stream function and assert suspend removes observation while resume restores zero and streamed progress.
- [x] 2.2 Retain focused adapter/integration coverage for progress completion, compaction-end cleanup, unobservable fallback, and pinned presentation isolation.

## 3. Validate

- [x] 3.1 Run focused runtime, compaction observer, adapter, integration, and shell status tests plus typechecking, build, and strict OpenSpec validation; record implementation evidence and known-gap disposition.
