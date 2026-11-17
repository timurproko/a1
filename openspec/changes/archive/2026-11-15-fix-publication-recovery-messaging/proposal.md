## Why

Development publication run 43727703142 for source 59da04289f4491e83b862396b3b20e7fded62576 failed on macOS Node 24 in the exact-package cancellation and updater-loss contracts. The detached recovery entry compares its canonical module filename with a lexical argv filename, so macOS /var aliases can prevent the worker from executing. The local publication command also delegates presentation to a full GitHub job/step watcher, burying the actionable failure beneath orchestration noise.

## What Changes

- Recognize direct recovery-entry execution through canonical filesystem identity without running worker logic on import or weakening capsule verification.
- Cover aliased entry execution and the exact packaged cancellation/updater-loss behavior with focused regression tests.
- Present compact publication progress and a bounded, actionable final failure summary, retaining the full Actions log link and all publication gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: recovery entry dispatch works through filesystem path aliases.
- `continuous-integration`: local development-publication output distinguishes progress, primary failures, downstream blocks, and unavailable evidence.

## Impact

Recovery entry, recovery tests, publication client and its tests, and publication-command documentation. No version bump, workflow gate bypass, registry mutation, merge, or publication retry is part of this implementation authorization.
