## Context

`measure-resident-tabs.mjs` runs a fixture UI inside real resident tabs. For every lowercase letter that reaches its stdin, the fixture prints `measurement:<letter>:<hrtime>`. `measureInput` stamped `sentNs`, wrote one token, and took the first line for that token anywhere in the retained output.

A standby waits for promotion through `waitForStandbyPromotion`, which accepts either the in-band `\x1b]a1;standby-promote\x07` marker or a promotion file. When the file wins, as it did on macOS, the marker can arrive after the fixture's own stdin handler is installed. The handler then prints lines for the letters in `a1;standby-promote`. Later sends of `b`, `d`, `e`, `m`, `n`, `o`, `p`, `r`, `s`, and `t` matched those earlier lines and produced negative latencies, in both the failing run (`38791920231`) and the previous green run (`38783656121`).

The summary dropped negative values. With 13 of 23 samples left, p95 resolved to the maximum, which is the cold first input.

## Goals / Non-Goals

**Goals:**
- Attribute every input sample to its own send.
- Make a measurement fault visible as a failure instead of an unexplained budget change.

**Non-Goals:**
- Change any budget, sample count, or CI step.
- Change standby promotion or how the product consumes a late marker.

## Decisions

### 1. Match on the timestamp, not on buffer position

`findProcessedInput` scans every line for the token and returns the first one whose timestamp is at or after `sentNs`. A buffer checkpoint taken at send time is not enough, because a stale line printed just before the send can still be in flight and arrive after the checkpoint. The parent and the fixture both read `process.hrtime`, the shared monotonic clock the metric already relies on.

Alternatives rejected:
- Stripping OSC sequences in the fixture would depend on the marker arriving in one chunk and would still leave any other stray letter able to satisfy a match.
- Choosing tokens outside the marker's letters would hide the fault instead of removing it.

### 2. Reject, record, and fail invalid samples

The summary now counts recorded values that are negative or non-numeric as `rejectedSamples` and fails that metric. Metrics recorded only on the first sample (cold launch, warm creation, reattach) still treat other samples' missing fields as absent rather than rejected.

## Risks / Trade-offs

- **[A real regression in the cold first input is now one sample of 23]** → Cold launch keeps its own budget. Input-to-process is a p95 budget by declaration, and the earlier behavior measured the maximum by accident.
- **[A fixture line could match a later send of the same token]** → Every token in one run is unique, and the timestamp lower bound excludes earlier sends.

## Migration Plan

No migration is required. The summary JSON gains a `rejectedSamples` field per metric; nothing else reads the field set.
