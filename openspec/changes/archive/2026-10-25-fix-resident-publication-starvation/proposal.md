## Why

Resident input and menu scrolling feel blocked compared with direct solo. Source inspection found that Windows holder end markers renew a 40 ms render-pass wait indefinitely during sustained updates; a model with twenty frames 30 ms apart withheld changed cells for 611 ms. The recent completion-driven pipe repair does not change that publication state machine. The real-A1 progress report also records 200 ms commit-to-paint latency without failing its verdict.

## What Changes

- Preserve one non-renewable deadline for unpublished Windows render-pass work across subsequent markers and settling activity, clear it only when publication is consumed, and keep open transactions private except for existing explicit recovery.
- Add native sustained-frame and fragmented-output regressions, plus a real-A1 resident-versus-solo input fixture for typing, navigation and scrolling that observes completed synthetic screen changes rather than process liveness.
- Enforce the existing healthy commit-to-paint budget and reject missing presentation samples; keep deliberately paused sinks and stopped-stage controls outside healthy measurement windows.

The maintainer approved the investigation's proposed publication repair and responsiveness regressions and explicitly requested implementation in the current interaction. Full-grid transport optimization is deferred until profiling demonstrates a need; this repair does not introduce wire deltas, restart live resident cohorts, or remove synchronization safeguards.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: bounded non-starving publication and enforced healthy responsiveness evidence.

## Impact

Native holder scheduling and focused tests; existing real-A1 parallel-progress fixture and latency report/tests; resident architecture documentation. No protocol generation, credentials, process isolation, stored sessions, or solo renderer behavior changes.
