# Tasks

## 1. Make supported clipboard delivery resilient

- [x] 1.1 Add focused transport regressions for native success, transient contention, missing native bindings, platform-command fallback, terminal destinations, cancellation, deadlines, and sequential exactly-once attempts.
- [x] 1.2 Introduce one cancelable standard-clipboard writer for supported local platforms with bounded transient retry and platform fallback, and route prepared selection text through it.
- [x] 1.3 Expose the owned terminal clipboard submission route independently of process `stdout` classification for remote, pseudoterminal, and resident sessions while preserving active-view fencing.
- [x] 1.4 Remove copy-failure workflow presentation while retaining content-free diagnostics, successful acknowledgement, limits, and stale-intent suppression.

## 2. Copy visible application messages

- [x] 2.1 Add viewport and shell regressions for status, warning, error, command-result, and notice selections alone and in mixed ranges under enabled and disabled copy-on-select settings.
- [x] 2.2 Declare message-row copy ranges from dock composition and carry them through full and dock-only frames, wrapping, resize, replacement, and retained-selection reprojection.
- [x] 2.3 Apply the shared message eligibility to automatic release and explicit `Ctrl+C` while excluding structural chrome and preserving exact plain-text columns and order.

## 3. Preserve installed and resident behavior

- [x] 3.1 Add packaged-platform coverage proving each supported installation can load or reach a standard clipboard writer without relying on a repository ancestor.
- [x] 3.2 Extend resident clipboard coverage for viewed-tab exactly-once delivery and hidden, stale, switched, detached, and failed-tab refusal.
- [x] 3.3 Preserve `a1 pi`, `/copy`, keyboard prompt copy/cut, selection painting, input responsiveness, and bounded shutdown behavior in focused regressions.

## 4. Complete implementation evidence

- [x] 4.1 Run typechecking, focused clipboard/selection/package/resident tests, and strict OpenSpec validation; record implementation evidence and any reviewed known-gap disposition for finalization.
